"use client";
import React, { useState } from 'react';
import { useGameStore } from '@/lib/gameStore';

const WalletConnect: React.FC = () => {
    const [inputUsername, setInputUsername] = useState('');
    const { username, balance, connectWallet, disconnectWallet } = useGameStore();

    const handleConnect = () => {
        if (inputUsername.trim()) {
            connectWallet(inputUsername.trim());
            setInputUsername('');
        }
    };

    if (username) {
        return (
            <div className="wallet-connected">
                <div className="wallet-info">
                    <div className="username">
                        <span className="label">Player:</span>
                        <span className="value">{username}</span>
                    </div>
                    <div className="balance">
                        <span className="label">Balance:</span>
                        <span className="value">{balance} credits</span>
                    </div>
                </div>
                <button onClick={disconnectWallet} className="disconnect-btn">
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div className="wallet-connect-modal">
            <div className="modal-content">
                <div className="modal-header">
                    <div style={{ marginBottom: '20px' }}>
                        <svg viewBox="0 0 200 60" style={{ width: '180px', margin: '0 auto', display: 'block' }}>
                            <defs>
                                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#87CEEB" />
                                    <stop offset="100%" stopColor="#4DA6FF" />
                                </linearGradient>
                            </defs>
                            <text 
                                x="100" 
                                y="45" 
                                textAnchor="middle" 
                                fontFamily="'Fredoka One', cursive, Arial Black" 
                                fontSize="36" 
                                fill="url(#logoGradient)"
                                stroke="#FFF"
                                strokeWidth="1"
                            >
                                MemeRace
                            </text>
                        </svg>
                    </div>
                    <h2>🏁 Welcome to MemeRace!</h2>
                    <p>Enter your username to start racing</p>
                </div>

                <div className="modal-body">
                    <input
                        type="text"
                        value={inputUsername}
                        onChange={(e) => setInputUsername(e.target.value)}
                        placeholder="Enter username..."
                        className="username-input"
                        onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                        maxLength={20}
                    />

                    <button
                        onClick={handleConnect}
                        className="connect-btn"
                        disabled={!inputUsername.trim()}
                    >
                        Connect Wallet
                    </button>

                    <div className="starting-info">
                        <p>🎁 Starting balance: <strong>1000 credits</strong></p>
                        <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                            Race meme coins and win big!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WalletConnect;
