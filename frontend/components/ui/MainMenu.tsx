"use client";
import React from 'react';
import Image from 'next/image';
import { useGameStore } from '@/lib/gameStore';

const MainMenu: React.FC = () => {
  const { racers, playerCount, startBettingRound, disconnectWallet, setGameState } = useGameStore();

  const handleRaceClick = () => {
    startBettingRound();
  };

  const handleLeaderboardClick = () => {
    setGameState('LEADERBOARD');
  };

  return (
    <div className="main-menu">
      {/* Header */}
      <header className="menu-header">
        <button className="menu-header-btn" onClick={disconnectWallet} title="Settings">
          ⚙️
        </button>
        <h1 className="menu-title">MemeRace</h1>
        <button className="menu-header-btn" title="Menu">
          ☰
        </button>
      </header>

      {/* Race Preview Area */}
      <div className="race-preview">
        {/* Decorative Clouds */}
        <div className="preview-clouds">
          <div className="preview-cloud" style={{ left: '5%', top: '5%' }}></div>
          <div className="preview-cloud" style={{ left: '25%', top: '3%', animationDelay: '0.5s' }}></div>
          <div className="preview-cloud" style={{ left: '55%', top: '8%', animationDelay: '1s' }}></div>
          <div className="preview-cloud" style={{ left: '80%', top: '4%', animationDelay: '1.5s' }}></div>
        </div>

        {/* Decorative Trees */}
        <div className="preview-trees">
          <div className="preview-tree" style={{ left: '8%' }}></div>
          <div className="preview-tree" style={{ left: '22%' }}></div>
          <div className="preview-tree" style={{ left: '38%' }}></div>
          <div className="preview-tree" style={{ left: '52%' }}></div>
          <div className="preview-tree" style={{ left: '68%' }}></div>
          <div className="preview-tree" style={{ left: '82%' }}></div>
          <div className="preview-tree" style={{ left: '95%' }}></div>
        </div>

        <div className="racers-lineup">
          {racers.map((racer) => (
            <div key={racer.id} className="racer-preview-item">
              <Image
                src={racer.imagePath}
                alt={racer.name}
                width={80}
                height={80}
                className="racer-preview-img"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Players Bar */}
      <div className="players-bar">
        <span className="players-icon">👥</span>
        <span className="players-count">{playerCount} Players</span>
        <span style={{ marginLeft: 'auto' }}>🌿</span>
      </div>

      {/* Action Buttons */}
      <div className="menu-actions">
        <div className="floating-coins">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="floating-coin"
              style={{
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 30}%`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        <button className="race-btn" onClick={handleRaceClick}>
          <span className="race-btn-crown">👑</span>
          <span className="race-btn-stars">⭐</span>
          RACE
          <span className="race-btn-stars">⭐</span>
        </button>

        <br />

        <button className="leaderboard-btn" onClick={handleLeaderboardClick}>
          Global Leaderboard
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
