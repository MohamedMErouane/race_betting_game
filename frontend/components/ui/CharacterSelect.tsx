"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { useGameStore } from '@/lib/gameStore';

interface CharacterSelectProps {
  betting: {
    placeBet: (racerIndex: number, solAmount: number) => Promise<boolean>;
    isBetting: boolean;
    betPlaced: boolean;
    betError: string | null;
    raceInfo: { totalPool: number; betCounts: Record<number, number> } | null;
  };
}

const CharacterSelect: React.FC<CharacterSelectProps> = ({ betting }) => {
  const { racers, playerCount, selectedCategory, setGameState, bettingTimeLeft, solBalance } = useGameStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  const betAmountSOL = selectedCategory?.currency === 'SOL' ? selectedCategory.amount : 0;

  const handleCharacterSelect = (index: number) => {
    if (betting.betPlaced || betting.isBetting) return;
    setSelectedIndex(index);
    setError('');
  };

  const handleConfirmBet = async () => {
    if (bettingTimeLeft <= 0) {
      setError('Entry window closed. Race is starting.');
      return;
    }

    if (selectedIndex === null) {
      setError('Please select a meme character!');
      return;
    }

    if (betAmountSOL > solBalance) {
      setError(`Insufficient SOL! Need ${betAmountSOL} SOL`);
      return;
    }

    if (betting.betPlaced) {
      setError('Bet already placed for this race!');
      return;
    }

    const success = await betting.placeBet(selectedIndex, betAmountSOL);
    if (!success) {
      setError(betting.betError ?? 'Transaction failed');
    }
  };

  const handleBack = () => {
    setGameState('CATEGORY_SELECT');
  };

  const poolSOL = betting.raceInfo ? (betting.raceInfo.totalPool / 1_000_000_000).toFixed(4) : '0';

  return (
    <>
      {/* Players Bar */}
      <div className="players-bar">
        <span className="players-icon">👥</span>
        <span className="players-count">{playerCount} Players</span>
        <span className="wallet-balance">Pool: {poolSOL} SOL</span>
        <span style={{ marginLeft: 'auto' }} className="betting-countdown">⏱ {bettingTimeLeft}s</span>
      </div>

      {/* Character Selection */}
      <div className="character-select">
        <h2 className="character-title">Choose Your Meme</h2>
        
        <div className="character-grid">
          {racers.map((racer, index) => {
            const betCount = betting.raceInfo?.betCounts[index] ?? 0;
            return (
              <div
                key={racer.id}
                className={`character-card ${selectedIndex === index ? 'selected' : ''} ${betting.betPlaced && selectedIndex === index ? 'confirmed' : ''}`}
                onClick={() => handleCharacterSelect(index)}
              >
                <div className="character-img-wrapper">
                  <Image
                    src={racer.imagePath}
                    alt={racer.name}
                    width={50}
                    height={50}
                    className="character-img"
                  />
                </div>
                <span className="character-name">{racer.name}</span>
                {betCount > 0 && <span className="bet-count">{betCount} bets</span>}
              </div>
            );
          })}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          {betting.betPlaced ? (
            <div className="bet-confirmed-msg">
              ✅ Bet placed on {selectedIndex !== null ? racers[selectedIndex]?.name : ''} — {betAmountSOL} SOL
            </div>
          ) : (
            <button
              className="place-bet-btn"
              onClick={handleConfirmBet}
              disabled={selectedIndex === null || bettingTimeLeft <= 0 || betting.isBetting}
              style={{ maxWidth: '300px', margin: '0 auto' }}
            >
              {betting.isBetting ? '⏳ Signing Transaction...' : `Confirm Entry — ${betAmountSOL} SOL`}
            </button>
          )}
          
          <div className="balance-info" style={{ marginTop: '15px' }}>
            Your Balance: <strong>{solBalance.toFixed(4)} SOL</strong>
          </div>
        </div>
      </div>
    </>
  );
};

export default CharacterSelect;
