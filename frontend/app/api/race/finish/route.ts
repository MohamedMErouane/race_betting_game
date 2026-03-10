import { NextRequest, NextResponse } from 'next/server';
import {
  finishRace as finishRaceService,
  getCurrentRace,
  getRaceInfo,
  createRace,
} from '@/lib/bettingService';
import {
  escrow,
  connection,
  ensureEscrowFunded,
} from '@/lib/escrowWallet';
import {
  Transaction,
  SystemProgram,
  PublicKey,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

const MAX_PAYOUT_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// POST /api/race/finish — Submit race results and trigger payouts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { finishOrder } = body;

  if (!Array.isArray(finishOrder) || finishOrder.length === 0) {
    return NextResponse.json({ error: 'Invalid finish order' }, { status: 400 });
  }

  const race = getCurrentRace();
  if (!race) {
    return NextResponse.json({ error: 'No active race' }, { status: 400 });
  }

  // Calculate payouts
  const result = finishRaceService(race.id, finishOrder);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { payouts, houseFee, totalPool } = result;

  console.log(`[Finish Route] Race done. Pool=${totalPool} lamports (${(totalPool / LAMPORTS_PER_SOL).toFixed(6)} SOL), payouts=${payouts.length}`);
  console.log(`[Finish Route] House wallet: ${escrow.address}`);

  // Check escrow balance before attempting payouts
  let escrowBalance = 0;
  try {
    escrowBalance = await connection.getBalance(escrow.publicKey);
    console.log(`[Finish Route] Escrow balance: ${escrowBalance} lamports (${(escrowBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL)`);
  } catch (err) {
    console.error('[Finish Route] Failed to check escrow balance:', err instanceof Error ? err.message : err);
  }

  // Execute winner payouts from house wallet
  // 100% of bets go to house → winners get paid out → house keeps losers' bets
  const payoutResults: Array<{
    wallet: string;
    amount: number;
    txSignature: string | null;
    error?: string;
  }> = [];

  if (totalPool > 0 && payouts.length > 0) {
    // Calculate total payout needed
    const totalPayoutNeeded = payouts.reduce((sum, p) => sum + p.amountLamports, 0);
    const TX_FEE_BUFFER = 15000; // buffer for Solana tx fee

    // Cap payouts at what the escrow actually has (minus tx fee)
    const availableForPayout = Math.max(0, escrowBalance - TX_FEE_BUFFER);

    if (availableForPayout <= 0) {
      console.error(`[Finish Route] ⚠️  Escrow has ${escrowBalance} lamports — not enough for payouts + tx fee`);
      // Try to fund the escrow
      try {
        await ensureEscrowFunded((totalPayoutNeeded + TX_FEE_BUFFER) / LAMPORTS_PER_SOL + 0.1);
        escrowBalance = await connection.getBalance(escrow.publicKey);
        console.log(`[Finish Route] Escrow balance after fund attempt: ${escrowBalance} lamports`);
      } catch {
        console.error('[Finish Route] ⚠️  Could not fund escrow. Payouts will fail.');
      }
    }

    // Recalculate available after possible funding
    const finalAvailable = Math.max(0, (escrowBalance > availableForPayout ? escrowBalance : availableForPayout) - TX_FEE_BUFFER);
    const scaleFactor = totalPayoutNeeded > 0 && totalPayoutNeeded > finalAvailable
      ? finalAvailable / totalPayoutNeeded
      : 1.0;

    if (scaleFactor < 1.0) {
      console.warn(`[Finish Route] ⚠️  Scaling payouts to ${(scaleFactor * 100).toFixed(1)}% — escrow has ${finalAvailable} but needs ${totalPayoutNeeded}`);
    }

    // Build transaction
    const transaction = new Transaction();

    for (const payout of payouts) {
      const adjustedAmount = Math.floor(payout.amountLamports * scaleFactor);
      if (adjustedAmount <= 0) continue;
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: escrow.publicKey,
          toPubkey: new PublicKey(payout.wallet),
          lamports: adjustedAmount,
        })
      );
    }

    // Send payout transaction with retries
    if (transaction.instructions.length > 0) {
      let lastError = '';
      for (let attempt = 1; attempt <= MAX_PAYOUT_RETRIES; attempt++) {
        try {
          // Explicitly set feePayer and fresh blockhash for each attempt
          transaction.feePayer = escrow.publicKey;
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
          transaction.recentBlockhash = blockhash;
          transaction.lastValidBlockHeight = lastValidBlockHeight;

          // Clear any previous signatures (needed for retry with new blockhash)
          transaction.signatures = [];

          const sig = await sendAndConfirmTransaction(
            connection,
            transaction,
            [escrow.keypair],
            { commitment: 'confirmed' }
          );
          console.log(`[Finish Route] ✅ Payout TX confirmed (attempt ${attempt}): ${sig}`);

          for (const payout of payouts) {
            const adjustedAmount = Math.floor(payout.amountLamports * scaleFactor);
            if (adjustedAmount <= 0) continue;
            payoutResults.push({
              wallet: payout.wallet,
              amount: adjustedAmount,
              txSignature: sig,
            });
          }
          lastError = '';
          break; // Success — exit retry loop
        } catch (err) {
          lastError = err instanceof Error ? err.message : 'Payout failed';
          console.error(`[Finish Route] Payout TX attempt ${attempt}/${MAX_PAYOUT_RETRIES} failed: ${lastError}`);
          if (attempt < MAX_PAYOUT_RETRIES) {
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }

      // All retries failed
      if (lastError) {
        console.error(`[Finish Route] ❌ Payout failed after ${MAX_PAYOUT_RETRIES} attempts: ${lastError}`);
        for (const payout of payouts) {
          const adjustedAmount = Math.floor(payout.amountLamports * scaleFactor);
          if (adjustedAmount <= 0) continue;
          payoutResults.push({
            wallet: payout.wallet,
            amount: adjustedAmount,
            txSignature: null,
            error: lastError,
          });
        }
      }
    }
  } else {
    console.log('[Finish Route] No bets in pool or no winners — nothing to pay out');
  }

  // Auto-create next race
  const nextRace = createRace();
  ensureEscrowFunded().catch(() => {});

  return NextResponse.json({
    raceId: race.id,
    finishOrder,
    totalPool,
    houseFee,
    payouts: payoutResults,
    nextRace: getRaceInfo(nextRace.id),
    escrowAddress: escrow.address,
    houseAddress: escrow.address,
  });
}
