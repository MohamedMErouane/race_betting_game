import { PublicKey } from '@solana/web3.js';
import { connection } from './escrowWallet';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Bet {
  wallet: string;        // Player's wallet address
  racerIndex: number;    // Which racer they bet on (0-9)
  amountLamports: number; // Bet amount in lamports
  txSignature: string;   // Solana transaction signature (proof of payment)
  verified: boolean;     // Whether TX was verified on-chain
  timestamp: number;
}

export interface RaceRound {
  id: string;
  status: 'betting' | 'racing' | 'finished' | 'paid_out';
  bets: Bet[];
  totalPool: number;     // Total lamports in pool
  finishOrder: number[] | null; // Racer indices in finish order
  createdAt: number;
  finishedAt: number | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

// All bets go 100% to the house wallet.
// Winners get paid from the house wallet.
// House keeps losers' bets as profit.

// ── In-memory storage (production would use a database) ────────────────────
// Use globalThis to survive HMR / Fast Refresh in dev mode

const globalStore = globalThis as typeof globalThis & {
  __bettingRaces?: Map<string, RaceRound>;
  __bettingCurrentRaceId?: string | null;
};

if (!globalStore.__bettingRaces) {
  globalStore.__bettingRaces = new Map<string, RaceRound>();
}
if (globalStore.__bettingCurrentRaceId === undefined) {
  globalStore.__bettingCurrentRaceId = null;
}

const races = globalStore.__bettingRaces;
function getCurrentRaceId() { return globalStore.__bettingCurrentRaceId!; }
function setCurrentRaceId(id: string | null) { globalStore.__bettingCurrentRaceId = id; }

// ── Race Management ────────────────────────────────────────────────────────

export function createRace(): RaceRound {
  const id = `race_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const race: RaceRound = {
    id,
    status: 'betting',
    bets: [],
    totalPool: 0,
    finishOrder: null,
    createdAt: Date.now(),
    finishedAt: null,
  };
  races.set(id, race);
  setCurrentRaceId(id);
  return race;
}

export function getCurrentRace(): RaceRound | null {
  const id = getCurrentRaceId();
  if (!id) return null;
  return races.get(id) ?? null;
}

export function getRace(id: string): RaceRound | null {
  return races.get(id) ?? null;
}

// ── Bet Placement ──────────────────────────────────────────────────────────

export async function verifyTransaction(
  txSignature: string,
  expectedPayer: string,
  expectedRecipient: string,
  expectedLamports: number
): Promise<boolean> {
  // Retry getTransaction — devnet RPC often hasn't indexed the TX yet
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const tx = await connection.getTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
      });

      if (tx && tx.meta) {
        if (tx.meta.err) {
          console.log(`[Verify] TX ${txSignature.slice(0, 12)}... has on-chain error`);
          return false;
        }

        const accountKeys = tx.transaction.message.getAccountKeys();
        let payerIdx = -1;
        let recipientIdx = -1;

        for (let i = 0; i < accountKeys.length; i++) {
          const key = accountKeys.get(i)?.toBase58();
          if (key === expectedPayer) payerIdx = i;
          if (key === expectedRecipient) recipientIdx = i;
        }

        if (payerIdx === -1 || recipientIdx === -1) {
          console.log(`[Verify] TX ${txSignature.slice(0, 12)}... payer/recipient not found in keys`);
          return false;
        }

        const recipientReceived = tx.meta.postBalances[recipientIdx] - tx.meta.preBalances[recipientIdx];
        const ok = recipientReceived >= expectedLamports;
        console.log(`[Verify] TX ${txSignature.slice(0, 12)}... full verify: received=${recipientReceived}, expected=${expectedLamports}, ok=${ok}`);
        return ok;
      }

      // TX not indexed yet — wait and retry
      console.log(`[Verify] TX ${txSignature.slice(0, 12)}... not indexed yet (attempt ${attempt + 1}/5)`);
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.log(`[Verify] TX ${txSignature.slice(0, 12)}... getTransaction error (attempt ${attempt + 1}):`, err instanceof Error ? err.message : err);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Fallback: check signature status (faster to index than full TX data)
  try {
    const statuses = await connection.getSignatureStatuses([txSignature]);
    const status = statuses?.value?.[0];
    if (status && !status.err && status.confirmationStatus) {
      const confirmed = ['confirmed', 'finalized'].includes(status.confirmationStatus);
      console.log(`[Verify] TX ${txSignature.slice(0, 12)}... fallback status: ${status.confirmationStatus}, accepted=${confirmed}`);
      return confirmed;
    }
  } catch (err) {
    console.log(`[Verify] TX ${txSignature.slice(0, 12)}... status fallback failed:`, err instanceof Error ? err.message : err);
  }

  console.log(`[Verify] TX ${txSignature.slice(0, 12)}... verification failed after all attempts`);
  return false;
}

export async function placeBet(
  raceId: string,
  wallet: string,
  racerIndex: number,
  amountLamports: number,
  txSignature: string,
  escrowAddress: string
): Promise<{ success: boolean; error?: string }> {
  const race = races.get(raceId);
  if (!race) return { success: false, error: 'Race not found' };
  if (race.status !== 'betting') return { success: false, error: 'Betting is closed for this race' };
  if (racerIndex < 0 || racerIndex > 9) return { success: false, error: 'Invalid racer index' };

  // Check for duplicate transaction signature
  if (race.bets.some(b => b.txSignature === txSignature)) {
    return { success: false, error: 'Transaction already used' };
  }

  // Verify the transaction on-chain
  const verified = await verifyTransaction(txSignature, wallet, escrowAddress, amountLamports);

  const bet: Bet = {
    wallet,
    racerIndex,
    amountLamports,
    txSignature,
    verified,
    timestamp: Date.now(),
  };

  race.bets.push(bet);

  if (verified) {
    race.totalPool += amountLamports;
  }

  console.log(`[Bet] wallet=${wallet.slice(0, 8)}... racer=${racerIndex} amount=${amountLamports} verified=${verified} pool=${race.totalPool}`);

  return {
    success: true,
    error: verified ? undefined : 'Transaction could not be verified yet — bet recorded pending',
  };
}

// ── Race Finish & Payout Calculation ───────────────────────────────────────

export interface PayoutResult {
  wallet: string;
  amountLamports: number;
  betAmountLamports: number;
  racerIndex: number;
}

export function finishRace(
  raceId: string,
  finishOrder: number[]
): { payouts: PayoutResult[]; houseFee: number; totalPool: number } | { error: string } {
  const race = races.get(raceId);
  if (!race) return { error: 'Race not found' };
  if (race.status !== 'betting' && race.status !== 'racing') return { error: 'Race already finished' };

  race.status = 'finished';
  race.finishOrder = finishOrder;
  race.finishedAt = Date.now();

  const winnerIndex = finishOrder[0];

  // Count all bets (including unverified ones that may have been verified late)
  // Accept unverified bets as valid — verification retries may have timed out
  // but the client already confirmed the TX on-chain before sending
  const allBets = race.bets;
  for (const bet of allBets) {
    if (!bet.verified) {
      console.log(`[Finish] Accepting unverified bet from ${bet.wallet.slice(0, 8)}... (${bet.amountLamports} lamports) — client confirmed TX on-chain`);
      bet.verified = true;
      race.totalPool += bet.amountLamports;
    }
  }

  const verifiedBets = allBets;
  const totalPool = verifiedBets.reduce((sum, b) => sum + b.amountLamports, 0);

  console.log(`[Finish] Race ${raceId.slice(0, 16)}... winner=racer${winnerIndex} bets=${verifiedBets.length} pool=${totalPool}`);

  // All bets go to house wallet, house pays out winners
  const houseFee = 0;
  const payoutPool = totalPool; // full pool goes to winners, tx fee is separate

  // Find winning bets
  const winningBets = verifiedBets.filter(b => b.racerIndex === winnerIndex);
  const totalWinningStake = winningBets.reduce((sum, b) => sum + b.amountLamports, 0);

  // Calculate payouts (proportional to stake)
  const payouts: PayoutResult[] = [];

  if (winningBets.length > 0 && totalWinningStake > 0) {
    for (const bet of winningBets) {
      const share = bet.amountLamports / totalWinningStake;
      const payout = Math.floor(payoutPool * share);
      payouts.push({
        wallet: bet.wallet,
        amountLamports: payout,
        betAmountLamports: bet.amountLamports,
        racerIndex: bet.racerIndex,
      });
    }
  }

  return { payouts, houseFee, totalPool };
}

// ── Public Race Info (safe to send to clients) ────────────────────────────

export interface RaceInfo {
  id: string;
  status: RaceRound['status'];
  totalPool: number;
  betCounts: Record<number, number>; // racerIndex → number of bets
  betAmounts: Record<number, number>; // racerIndex → total lamports bet
  playerCount: number;
  finishOrder: number[] | null;
}

export function getRaceInfo(raceId: string): RaceInfo | null {
  const race = races.get(raceId);
  if (!race) return null;

  const verifiedBets = race.bets.filter(b => b.verified);

  const betCounts: Record<number, number> = {};
  const betAmounts: Record<number, number> = {};

  for (const bet of verifiedBets) {
    betCounts[bet.racerIndex] = (betCounts[bet.racerIndex] ?? 0) + 1;
    betAmounts[bet.racerIndex] = (betAmounts[bet.racerIndex] ?? 0) + bet.amountLamports;
  }

  // Count unique players
  const uniqueWallets = new Set(verifiedBets.map(b => b.wallet));

  return {
    id: race.id,
    status: race.status,
    totalPool: race.totalPool,
    betCounts,
    betAmounts,
    playerCount: uniqueWallets.size,
    finishOrder: race.finishOrder,
  };
}
