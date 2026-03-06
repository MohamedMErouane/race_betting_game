"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useGameStore } from '@/lib/gameStore';
import type { RaceGameHandle } from '@/components/game/RaceGame';

const PLACE_LABELS = ['1st', '2nd', '3rd'];
const PLACE_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

interface RaceLiveStandingsProps {
  raceGameRef: React.RefObject<RaceGameHandle | null>;
}

const RaceLiveStandings: React.FC<RaceLiveStandingsProps> = ({ raceGameRef }) => {
  const { racers, playerCount } = useGameStore();
  const [topIndices, setTopIndices] = useState<number[]>([]);

  // Poll live positions every 250ms
  useEffect(() => {
    const interval = setInterval(() => {
      if (raceGameRef.current) {
        const top3 = raceGameRef.current.getTopIndices(3);
        if (top3.length > 0) {
          setTopIndices(top3);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [raceGameRef]);

  return (
    <>
      {/* Live Top 3 */}
      <div className="race-leaderboard live-standings">
        <h2 className="leaderboard-title">🔴 Live Standings</h2>

        <div className="leaderboard-list">
          {topIndices.length > 0 ? topIndices.map((racerIdx, place) => {
            const racer = racers[racerIdx];
            if (!racer) return null;
            return (
              <div key={racerIdx} className="leaderboard-item">
                <div className="leaderboard-item-left">
                  <span className="live-place" style={{ color: PLACE_COLORS[place] }}>
                    {PLACE_LABELS[place]}
                  </span>
                  <Image
                    src={racer.imagePath}
                    alt={racer.name}
                    width={28}
                    height={28}
                    className="leaderboard-racer-img"
                  />
                  <span className="leaderboard-racer-name">{racer.name}</span>
                </div>
                <span className="live-place-badge" style={{ background: PLACE_COLORS[place] }}>
                  #{place + 1}
                </span>
              </div>
            );
          }) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', padding: '10px' }}>
              Race starting...
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RaceLiveStandings;
