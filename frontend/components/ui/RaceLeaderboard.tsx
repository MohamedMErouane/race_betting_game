"use client";
import React from 'react';
import Image from 'next/image';
import { useGameStore } from '@/lib/gameStore';

const RaceLeaderboard: React.FC = () => {
  const { racers, playerCount, leaderboard } = useGameStore();

  // Generate mock data if no leaderboard data exists
  const displayLeaderboard = leaderboard.length > 0 ? leaderboard : [
    { racerId: 8, players: 68, prize: 600 },
    { racerId: 3, players: 12, prize: 200 },
    { racerId: 2, players: 84, prize: 100 },
  ];

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
