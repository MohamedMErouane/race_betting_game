"use client";
import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import Image from 'next/image';

const PLACE_LABELS = ['🥇 1st', '🥈 2nd', '🥉 3rd'];
const PLACE_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

const RaceResults: React.FC = () => {
    const {
        currentRaceWinner,
        selectedRacer,
        betAmount,
        racers,
        balance,
        stats,
        raceTop3,
        selectedCategory,
    } = useGameStore();

    const [show, setShow] = useState(false);

    useEffect(() => {
        if (currentRaceWinner !== null) {
            setTimeout(() => setShow(true), 500);
        }
    }, [currentRaceWinner]);

    if (currentRaceWinner === null) return null;

    const hasPlacedBet = selectedRacer !== null && betAmount > 0;
    const isWin = selectedRacer === currentRaceWinner;
    const winner = racers[currentRaceWinner];
    const payout = isWin ? betAmount * winner.odds : 0;
    const currencyLabel = selectedCategory?.currency === 'SOL' ? 'SOL' : 'credits';

    return (
        <div className={`race-results-overlay ${show ? 'show' : ''}`}>
            <div className={`results-modal ${isWin ? 'win' : 'lose'}`}>
                {isWin && <div className="confetti"></div>}

                <div className="results-header">
                    <h2 className="results-title">
                        {isWin ? '🎉 YOU WIN! 🎉' : '😢 Good Luck Next Round'}
                    </h2>
                </div>

                {/* Top 3 Podium */}
                <div className="top3-podium">
                    <h3 style={{ textAlign: 'center', color: '#fff', marginBottom: '12px', fontSize: '18px' }}>
                        🏁 Race Results
                    </h3>
                    <div className="top3-list">
                        {raceTop3.map((entry, idx) => {
                            const racer = racers[entry.racerId];
                            const isPlayerBet = selectedRacer === entry.racerId;
                            return (
                                <div
                                    key={entry.racerId}
                                    className={`top3-item ${isPlayerBet ? 'top3-player-bet' : ''}`}
                                    style={{ borderLeft: `4px solid ${PLACE_COLORS[idx]}` }}
                                >
                                    <div className="top3-place" style={{ color: PLACE_COLORS[idx] }}>
                                        {PLACE_LABELS[idx]}
                                    </div>
                                    <Image
                                        src={racer?.imagePath || '/assets/coins/bonk.png'}
                                        alt={racer?.name || 'Racer'}
                                        width={50}
                                        height={50}
                                        className="top3-image"
                                    />
                                    <div className="top3-info">
                                        <div className="top3-name">{racer?.name || 'Unknown'}</div>
                                        <div className="top3-bets">
                                            👥 {entry.betCount} bets &bull; 💰 {entry.totalBets} {currencyLabel}
                                        </div>
                                    </div>
                                    {isPlayerBet && (
                                        <div className="top3-your-bet">YOUR BET</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="payout-section">
                    {!hasPlacedBet ? (
                        <>
                            <div className="payout-label">No Entry Selected</div>
                            <div className="payout-amount">Race completed without a wager.</div>
                        </>
                    ) : isWin ? (
                        <>
                            <div className="payout-label">Your Winnings:</div>
                            <div className="payout-amount win-amount">+{payout} {currencyLabel}</div>
                        </>
                    ) : (
                        <>
                            <div className="payout-label">Amount Lost:</div>
                            <div className="payout-amount lose-amount">-{betAmount} {currencyLabel}</div>
                        </>
                    )}
                </div>

                <div className="balance-update">
                    <span>New Balance:</span>
                    <span className="new-balance">{balance} credits</span>
                </div>

                <div className="stats-section">
                    <div className="stat-item">
                        <span className="stat-label">Wins:</span>
                        <span className="stat-value">{stats.wins}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Losses:</span>
                        <span className="stat-value">{stats.losses}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Total Races:</span>
                        <span className="stat-value">{stats.totalBets}</span>
                    </div>
                </div>

                <div className="results-actions">
                    <div style={{ textAlign: 'center', fontWeight: 700 }}>
                        Next round starts automatically...
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RaceResults;
