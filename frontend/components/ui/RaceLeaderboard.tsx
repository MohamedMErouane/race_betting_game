"use client";
import React from 'react';
import Image from 'next/image';
import { useGameStore } from '@/lib/gameStore';

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

interface RaceLeaderboardProps {
  payoutResult?: PayoutInfo | null;
}

const RaceLeaderboard: React.FC<RaceLeaderboardProps> = ({ payoutResult }) => {
  const { racers, playerCount, leaderboard, walletAddress } = useGameStore();

  // Generate mock data if no leaderboard data exists
  const displayLeaderboard = leaderboard.length > 0 ? leaderboard : [
    { racerId: 8, players: 68, prize: 600 },
    { racerId: 3, players: 12, prize: 200 },
    { racerId: 2, players: 84, prize: 100 },
  ];

  // Check if current user won a payout
  const myPayout = payoutResult?.payouts.find(p => p.wallet === walletAddress);
  const myPayoutError = myPayout?.error;
  const poolSOL = payoutResult ? (payoutResult.totalPool / 1_000_000_000).toFixed(4) : null;

  return (
    <>
      {/* Players Bar */}
      <div className="players-bar">
        <span className="players-icon">👥</span>
        <span className="players-count">{playerCount} Players</span>
        <span style={{ marginLeft: 'auto' }}>🌿</span>
      </div>

      {/* Leaderboard */}
      <div className="race-leaderboard">
        <h2 className="leaderboard-title">Race Leaderboard</h2>

        {/* Payout info */}
        {poolSOL && (
          <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '13px', color: '#a0e0ff' }}>
            Pool: {poolSOL} SOL
          </div>
        )}
        {myPayout && !myPayoutError && (
          <div style={{ textAlign: 'center', marginBottom: '10px', padding: '8px', background: 'rgba(0,255,100,0.15)', borderRadius: '8px', color: '#50ff50', fontSize: '14px', fontWeight: 'bold' }}>
            🎉 You won {(myPayout.amount / 1_000_000_000).toFixed(4)} SOL!
            {myPayout.txSignature && (
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                TX: {myPayout.txSignature.slice(0, 8)}...{myPayout.txSignature.slice(-8)}
              </div>
            )}
          </div>
        )}
        {myPayout && myPayoutError && (
          <div style={{ textAlign: 'center', marginBottom: '10px', padding: '8px', background: 'rgba(255,80,80,0.15)', borderRadius: '8px', color: '#ff6060', fontSize: '14px', fontWeight: 'bold' }}>
            ⚠️ Payout of {(myPayout.amount / 1_000_000_000).toFixed(4)} SOL failed
            <div style={{ fontSize: '11px', color: '#ff9090', marginTop: '4px' }}>
              {myPayoutError}
            </div>
          </div>
        )}

        <div className="leaderboard-list">
          {displayLeaderboard.map((entry, index) => {
            const racer = racers[entry.racerId];
            return (
              <div key={index} className="leaderboard-item">
                <div className="leaderboard-item-left">
                  <Image
                    src={racer?.imagePath || '/assets/coins/bonk.png'}
                    alt={racer?.name || 'Racer'}
                    width={45}
                    height={45}
                    className="leaderboard-racer-img"
                  />
                  <div className="leaderboard-racer-info">
                    <span className="leaderboard-racer-name">{racer?.name || 'Unknown'}</span>
                    <span className="leaderboard-players">
                      👥 {entry.players}
                    </span>
                  </div>
                </div>
                <span className="leaderboard-prize">${entry.prize}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default RaceLeaderboard;
