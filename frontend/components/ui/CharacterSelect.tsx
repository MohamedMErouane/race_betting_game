"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { useGameStore } from '@/lib/gameStore';

const CharacterSelect: React.FC = () => {
  const { racers, playerCount, betAmount, balance, placeBet, setGameState, bettingTimeLeft } = useGameStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleCharacterSelect = (index: number) => {
    setSelectedIndex(index);
    setError('');
  };

  const handleConfirmBet = () => {
    if (bettingTimeLeft <= 0) {
      setError('Entry window closed. Race is starting.');
      return;
    }

    if (selectedIndex === null) {
      setError('Please select a meme character!');
      return;
    }

    if (betAmount > balance) {
      setError('Insufficient balance!');
      return;
    }

    const success = placeBet(selectedIndex, betAmount);
    if (!success) {
      setError('Failed to save entry. Please try again.');
    }
  };

  const handleBack = () => {
    setGameState('CATEGORY_SELECT');
  };

  return (
    <>
      {/* Players Bar */}
      <div className="players-bar">
        <span className="players-icon">👥</span>
        <span className="players-count">{playerCount} Players</span>
        <span style={{ marginLeft: 'auto' }} className="betting-countdown">⏱ {bettingTimeLeft}s</span>
      </div>

      {/* Character Selection */}
      <div className="character-select">
        <h2 className="character-title">Choose Your Meme</h2>
        
        <div className="character-grid">
          {racers.map((racer, index) => (
            <div
              key={racer.id}
              className={`character-card ${selectedIndex === index ? 'selected' : ''}`}
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
            </div>
          ))}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            className="place-bet-btn"
            onClick={handleConfirmBet}
            disabled={selectedIndex === null || bettingTimeLeft <= 0}
            style={{ maxWidth: '300px', margin: '0 auto' }}
          >
            Confirm Entry - {betAmount} Credits
          </button>
          
          <div className="balance-info" style={{ marginTop: '15px' }}>
            Your Balance: <strong>{balance} credits</strong>
          </div>
        </div>
      </div>
    </>
  );
};

export default CharacterSelect;
