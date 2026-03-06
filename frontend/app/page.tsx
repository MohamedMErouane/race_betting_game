"use client";
import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import WalletConnect from '../components/ui/WalletConnect';
import IntroScreen from '../components/ui/IntroScreen';
import MainMenu from '../components/ui/MainMenu';
import CategorySelect from '../components/ui/CategorySelect';
import CharacterSelect from '../components/ui/CharacterSelect';
import RaceLeaderboard from '../components/ui/RaceLeaderboard';
import RaceLiveStandings from '../components/ui/RaceLiveStandings';
import GameHUD from '../components/ui/GameHUD';
import { useGameStore } from '../lib/gameStore';
import type { RaceGameHandle } from '../components/game/RaceGame';

// Dynamically import RaceGame with SSR disabled to avoid Phaser SSR issues
const RaceGame = dynamic(() => import('../components/game/RaceGame'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%',
      maxWidth: '1000px',
      aspectRatio: '16/10',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a1a2e',
      borderRadius: '12px',
      color: '#fff'
    }}>
      Loading game...
    </div>
  ),
});

// All states where the RaceGame canvas should stay mounted
const RACE_FLOW_STATES = ['CATEGORY_SELECT', 'CHARACTER_SELECT', 'BETTING', 'COUNTDOWN', 'RACING', 'FINISHED'];

export default function Home() {
  const { username, gameState, setGameState, finishRace, tickBettingTimer, startBettingRound } = useGameStore();
  const raceGameRef = useRef<RaceGameHandle>(null);

  // Auto-enter race flow on app entry (no manual RACE button click)
  useEffect(() => {
    if (username && gameState === 'MAIN_MENU') {
      startBettingRound();
    }
  }, [username, gameState, startBettingRound]);

  // Global 15-second betting timer
  useEffect(() => {
    if (!['CATEGORY_SELECT', 'CHARACTER_SELECT', 'BETTING'].includes(gameState)) {
      return;
    }

    const timer = window.setInterval(() => {
      tickBettingTimer();
    }, 1000);

    return () => window.clearInterval(timer);
  }, [gameState, tickBettingTimer]);

  // After each race, automatically open the next betting round
  useEffect(() => {
    if (gameState !== 'FINISHED') {
      return;
    }

    const nextRoundTimeout = window.setTimeout(() => {
      startBettingRound();
    }, 5000);

    return () => window.clearTimeout(nextRoundTimeout);
  }, [gameState, startBettingRound]);

  // Handle intro completion
  const handleIntroComplete = () => {
    if (username) {
      setGameState('MAIN_MENU');
    } else {
      setGameState('MAIN_MENU'); // Will show wallet connect
    }
  };

  // Show intro screen
  if (gameState === 'INTRO') {
    return <IntroScreen onComplete={handleIntroComplete} />;
  }

  // If user not connected, show wallet connect
  if (!username) {
    return <WalletConnect />;
  }

  // Main Menu
  if (gameState === 'MAIN_MENU') {
    return <MainMenu />;
  }

  // Global Leaderboard
  if (gameState === 'LEADERBOARD') {
    return <RaceLeaderboard />;
  }

  // All race-flow states: keep the SAME RaceGame canvas mounted throughout
  if (RACE_FLOW_STATES.includes(gameState)) {
    const isRacing = ['COUNTDOWN', 'RACING'].includes(gameState);
    return (
      <div className="game-container">
        {/* Header bar */}
        <header className="menu-header">
          <button className="menu-header-btn" title="Settings">⚙️</button>
          <h1 className="menu-title">MemeRace</h1>
          <button className="menu-header-btn" title="Menu">☰</button>
        </header>

        {/* Race canvas fills available space */}
        <div className="race-canvas-area">
          <RaceGame ref={raceGameRef} onRaceFinish={finishRace} />
        </div>

        {/* Single always-mounted bottom panel — content swaps inside to prevent layout jumps */}
        <div className="bottom-panel">
          {gameState === 'CATEGORY_SELECT' && <CategorySelect />}
          {gameState === 'CHARACTER_SELECT' && <CharacterSelect />}
          {gameState === 'FINISHED' && <RaceLeaderboard />}
          {isRacing && <RaceLiveStandings raceGameRef={raceGameRef} />}
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
