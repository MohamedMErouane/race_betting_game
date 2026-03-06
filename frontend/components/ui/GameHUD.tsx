"use client";
import React from 'react';
import { useGameStore } from '@/lib/gameStore';

const GameHUD: React.FC = () => {
    const { username, balance, betAmount, selectedRacer, racers, gameState, bettingTimeLeft } = useGameStore();

    if (!username) return null;

    return (
        <div className="game-hud">
            <div className="hud-left">
                <div className="hud-item player-name">
                    <span className="hud-label">Player</span>
                    <span className="hud-value">{username}</span>
                </div>
            </div>

            <div className="hud-center">
                {['CATEGORY_SELECT', 'CHARACTER_SELECT', 'BETTING'].includes(gameState) && (
                    <div className="current-bet" style={{ marginBottom: '8px' }}>
                        <span className="bet-label">Next race in:</span>
                        <span className="bet-racer">{bettingTimeLeft}s</span>
                    </div>
                )}
                {betAmount > 0 && selectedRacer !== null && (
                    <div className="current-bet">
                        <span className="bet-label">Selected:</span>
                        <span className="bet-racer">{racers[selectedRacer].name}</span>
                        <span className="bet-amount">{betAmount} credits</span>
                    </div>
                )}
            </div>

            <div className="hud-right">
                <div className="hud-item balance">
                    <span className="hud-label">Balance</span>
                    <span className="hud-value balance-amount">{balance}</span>
                </div>
            </div>
        </div>
    );
};

export default GameHUD;
