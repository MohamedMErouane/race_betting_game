"use client";
import React from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

const WalletConnect: React.FC = () => {
    const { setVisible } = useWalletModal();

    const handleConnect = () => {
        setVisible(true);
    };

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
                    <p>Connect your Solana wallet to start racing</p>
                </div>

                <div className="modal-body">
                    <button
                        onClick={handleConnect}
                        className="connect-btn"
                    >
                        🔗 Connect Wallet
                    </button>

                    <div className="starting-info">
                        <p style={{ fontSize: '13px', color: '#aaa', marginTop: '16px' }}>
                            Supports Phantom, Solflare &amp; other Solana wallets
                        </p>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                            Solana Devnet
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WalletConnect;
