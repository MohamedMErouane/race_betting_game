import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import type { RaceInfo } from '@/lib/bettingService';

interface BettingState {
  raceId: string | null;
  escrowAddress: string | null;
  houseAddress: string | null;
  raceInfo: RaceInfo | null;
  isBetting: boolean;
  betPlaced: boolean;
  betError: string | null;
  payoutResult: PayoutInfo | null;
}

interface PayoutInfo {
  totalPool: number;
  houseFee: number;
  payouts: Array<{
    wallet: string;
    amount: number;
    txSignature: string | null;
    error?: string;
  }>;
}

export function useBetting() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [state, setState] = useState<BettingState>({
    raceId: null,
    escrowAddress: null,
    houseAddress: null,
    raceInfo: null,
    isBetting: false,
    betPlaced: false,
    betError: null,
    payoutResult: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch current race info from server
  const fetchRace = useCallback(async () => {
    try {
      const res = await fetch('/api/race');
      if (!res.ok) return;
      const data = await res.json();
      setState(prev => ({
        ...prev,
        raceId: data.race?.id ?? null,
        escrowAddress: data.escrowAddress ?? null,
        houseAddress: data.houseAddress ?? null,
        raceInfo: data.race ?? null,
      }));
    } catch {
      // Will retry on next poll
    }
  }, []);

  // Start polling race info
  useEffect(() => {
    fetchRace();
    pollRef.current = setInterval(fetchRace, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchRace]);

  // Place a bet: send 100% of SOL to house wallet
  const placeBet = useCallback(async (racerIndex: number, solAmount: number) => {
    if (!publicKey || !state.houseAddress || !state.raceId) {
      setState(prev => ({ ...prev, betError: 'Wallet not connected or no active race' }));
      return false;
    }

    setState(prev => ({ ...prev, isBetting: true, betError: null }));

    try {
      const totalLamports = Math.round(solAmount * LAMPORTS_PER_SOL);
      const housePubkey = new PublicKey(state.houseAddress);

      // Build TX: 100% goes to house wallet
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: housePubkey,
          lamports: totalLamports,
        })
      );

      // Get fresh blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction (user signs via wallet extension)
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      console.log(`[Bet] TX confirmed: ${signature}`);
      console.log(`[Bet] House wallet gets ${totalLamports} lamports (${solAmount} SOL)`);

      // Register bet with server (full amount goes to the pool)
      const res = await fetch('/api/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          racerIndex,
          amountLamports: totalLamports,
          txSignature: signature,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState(prev => ({ ...prev, isBetting: false, betError: data.error ?? 'Bet failed' }));
        return false;
      }

      setState(prev => ({
        ...prev,
        isBetting: false,
        betPlaced: true,
        betError: null,
        raceInfo: data.race ?? prev.raceInfo,
      }));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setState(prev => ({ ...prev, isBetting: false, betError: message }));
      return false;
    }
  }, [publicKey, state.houseAddress, state.raceId, connection, sendTransaction]);

  // Submit race results and trigger payouts
  const submitFinish = useCallback(async (finishOrder: number[]) => {
    try {
      const res = await fetch('/api/race/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finishOrder }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[Betting] Finish error:', data.error);
        return;
      }

      setState(prev => ({
        ...prev,
        payoutResult: {
          totalPool: data.totalPool,
          houseFee: data.houseFee,
          payouts: data.payouts,
        },
        // Update to next race
        raceId: data.nextRace?.id ?? null,
        raceInfo: data.nextRace ?? null,
        escrowAddress: data.escrowAddress ?? prev.escrowAddress,
        houseAddress: data.houseAddress ?? prev.houseAddress,
      }));
    } catch (err) {
      console.error('[Betting] Finish failed:', err);
    }
  }, []);

  // Reset for next race
  const resetBet = useCallback(() => {
    setState(prev => ({
      ...prev,
      betPlaced: false,
      betError: null,
      payoutResult: null,
    }));
  }, []);

  return {
    ...state,
    placeBet,
    submitFinish,
    resetBet,
    refreshRace: fetchRace,
  };
}
