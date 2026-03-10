"use client";
import { useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import WalletConnect from '../components/ui/WalletConnect';
import IntroScreen from '../components/ui/IntroScreen';
import MainMenu from '../components/ui/MainMenu';
import CategorySelect from '../components/ui/CategorySelect';
import CharacterSelect from '../components/ui/CharacterSelect';
import RaceLeaderboard from '../components/ui/RaceLeaderboard';
import RaceLiveStandings from '../components/ui/RaceLiveStandings';
import GameHUD from '../components/ui/GameHUD';
import { useGameStore } from '../lib/gameStore';
import { useBetting } from '../lib/useBetting';
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
  const { username, gameState, setGameState, finishRace, tickBettingTimer, startBettingRound, solBalance, displayName, disconnectWallet, connectWallet, updateSolBalance } = useGameStore();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const raceGameRef = useRef<RaceGameHandle>(null);
  const hasConnected = useRef(false);
  const betting = useBetting();

  // Sync wallet connection to game store (runs at page level so it works on all screens)
  useEffect(() => {
    if (connected && publicKey) {
      hasConnected.current = true;
      const addr = publicKey.toBase58();
      const shortAddr = `${addr.slice(0, 4)}...${addr.slice(-4)}`;
      connectWallet(addr, shortAddr);
    }
  }, [connected, publicKey, connectWallet]);

  // Fetch SOL balance when wallet is connected
  useEffect(() => {
    if (!connected || !publicKey) return;
    let cancelled = false;
    const fetchBalance = async () => {
      try {
        const lamports = await connection.getBalance(publicKey);
        if (!cancelled) updateSolBalance(lamports / LAMPORTS_PER_SOL);
      } catch { /* retry next poll */ }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [connected, publicKey, connection, updateSolBalance]);

  // Sync wallet disconnect: only fires after wallet was connected at least once
  // (prevents premature disconnect before autoConnect completes)
  useEffect(() => {
    if (!connected && hasConnected.current && username) {
      disconnectWallet();
    }
  }, [connected, username, disconnectWallet]);

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
      betting.resetBet();
      startBettingRound();
    }, 5000);

    return () => window.clearTimeout(nextRoundTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // If wallet not connected, show wallet connect
  if (!connected) {
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
          <span className="header-wallet-info">{displayName} | {solBalance.toFixed(2)} SOL</span>
          <button className="menu-header-btn" title="Menu">☰</button>
        </header>

        {/* Race canvas fills available space */}
        <div className="race-canvas-area">
          <RaceGame ref={raceGameRef} onRaceFinish={(finishOrder) => {
            finishRace(finishOrder);
            betting.submitFinish(finishOrder);
          }} />
        </div>

        {/* Single always-mounted bottom panel — content swaps inside to prevent layout jumps */}
        <div className="bottom-panel">
          {gameState === 'CATEGORY_SELECT' && <CategorySelect />}
          {gameState === 'CHARACTER_SELECT' && <CharacterSelect betting={betting} />}
          {gameState === 'FINISHED' && <RaceLeaderboard payoutResult={betting.payoutResult} />}
          {isRacing && <RaceLiveStandings raceGameRef={raceGameRef} />}
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
