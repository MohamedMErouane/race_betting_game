"use client";
import React, { useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import Image from 'next/image';

const BettingPanel: React.FC = () => {
    const { racers, balance, selectedRacer, placeBet, setGameState } = useGameStore();
    const [localSelectedRacer, setLocalSelectedRacer] = useState<number | null>(null);
    const [betAmount, setBetAmount] = useState<number>(0);
    const [error, setError] = useState<string>('');

    const presetAmounts = [10, 50, 100, 500];

    const handleSelectRacer = (index: number) => {
        setLocalSelectedRacer(index);
        setError('');
    };

    const handleBetAmountChange = (amount: number) => {
        setBetAmount(amount);
        setError('');
    };

    const handleCustomBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value) || 0;
        setBetAmount(value);
        setError('');
    };

    const handlePlaceBet = () => {
        setError('');

        if (localSelectedRacer === null) {
            setError('Please select a racer!');
            return;
        }

        if (betAmount <= 0) {
            setError('Please enter an entry amount!');
            return;
        }

        if (betAmount > balance) {
            setError('Insufficient balance!');
            return;
        }

        const success = placeBet(localSelectedRacer, betAmount);
        if (success) {
            // Bet placed, game will transition to COUNTDOWN
            setLocalSelectedRacer(null);
            setBetAmount(0);
        } else {
            setError('Failed to save entry. Please try again.');
        }
    };

    return (
        <div className="betting-panel">
            <div className="betting-content">
                <h2 className="betting-title">🏁 Confirm Your Entry!</h2>

                <div className="racers-grid">
                    {racers.map((racer, index) => (
                        <div
                            key={racer.id}
                            className={`racer-card ${localSelectedRacer === index ? 'selected' : ''}`}
                            onClick={() => handleSelectRacer(index)}
                        >
                            <div className="racer-number">#{index + 1}</div>
                            <div className="racer-image-container">
                                <Image
                                    src={racer.imagePath}
                                    alt={racer.name}
                                    width={80}
                                    height={80}
                                    className="racer-image"
                                />
                            </div>
                            <div className="racer-name">{racer.name}</div>
                            <div className="racer-odds">{racer.odds}x payout</div>
                        </div>
                    ))}
                </div>

                <div className="bet-amount-section">
                    <h3>Entry Amount</h3>
                    <div className="preset-bets">
                        {presetAmounts.map((amount) => (
                            <button
                                key={amount}
                                className={`preset-btn ${betAmount === amount ? 'active' : ''}`}
                                onClick={() => handleBetAmountChange(amount)}
                                disabled={amount > balance}
                            >
                                {amount}
                            </button>
                        ))}
                    </div>

                    <div className="custom-bet">
                        <input
                            type="number"
                            value={betAmount || ''}
                            onChange={handleCustomBetChange}
                            placeholder="Custom amount..."
                            className="custom-bet-input"
                            min="1"
                            max={balance}
                        />
                    </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button
                    onClick={handlePlaceBet}
                    className="place-bet-btn"
                    disabled={localSelectedRacer === null || betAmount <= 0}
                >
                    Confirm Entry - Win {localSelectedRacer !== null ? racers[localSelectedRacer].odds * betAmount : 0} Credits!
                </button>

                <div className="balance-info">
                    Available Balance: <strong>{balance} credits</strong>
                </div>
            </div>
        </div>
    );
};

export default BettingPanel;
