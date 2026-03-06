"use client";
import React, { useEffect, useState } from 'react';

interface IntroScreenProps {
  onComplete: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="intro-screen">
      {/* Decorative Clouds */}
      <div className="intro-clouds">
        <div className="intro-cloud" style={{ left: '10%', top: '8%', animationDelay: '0s' }}></div>
        <div className="intro-cloud" style={{ left: '30%', top: '5%', animationDelay: '0.5s' }}></div>
        <div className="intro-cloud" style={{ left: '60%', top: '10%', animationDelay: '1s' }}></div>
        <div className="intro-cloud" style={{ left: '80%', top: '6%', animationDelay: '1.5s' }}></div>
      </div>

      {/* Decorative Trees */}
      <div className="intro-trees">
        <div className="intro-tree" style={{ left: '5%' }}></div>
        <div className="intro-tree" style={{ left: '20%' }}></div>
        <div className="intro-tree" style={{ left: '35%' }}></div>
        <div className="intro-tree" style={{ left: '55%' }}></div>
        <div className="intro-tree" style={{ left: '70%' }}></div>
        <div className="intro-tree" style={{ left: '85%' }}></div>
        <div className="intro-tree" style={{ left: '95%' }}></div>
      </div>

      <div className="intro-logo">
        {/* Logo placeholder - using text styling to mimic MemeRace logo */}
        <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
          {/* Doge/Shiba character */}
          <defs>
            <linearGradient id="dogeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#FFA500" />
            </linearGradient>
            <linearGradient id="textGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#87CEEB" />
              <stop offset="100%" stopColor="#4DA6FF" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/>
            </filter>
          </defs>
          
          {/* Stars */}
          <text x="80" y="30" fill="#FFD700" fontSize="16">✦</text>
          <text x="220" y="35" fill="#FFD700" fontSize="12">✦</text>
          <text x="100" y="50" fill="#FFF" fontSize="10">✦</text>
          <text x="200" y="45" fill="#FFF" fontSize="8">✦</text>
          <text x="130" y="25" fill="#FFD700" fontSize="10">✦</text>
          <text x="170" y="30" fill="#FFF" fontSize="12">✦</text>
          
          {/* Shiba/Doge body */}
          <ellipse cx="150" cy="90" rx="70" ry="55" fill="url(#dogeGradient)" filter="url(#shadow)"/>
          
          {/* Face cream color */}
          <ellipse cx="150" cy="95" rx="45" ry="40" fill="#FFF8DC"/>
          
          {/* Ears */}
          <ellipse cx="100" cy="50" rx="20" ry="30" fill="url(#dogeGradient)" transform="rotate(-20 100 50)"/>
          <ellipse cx="200" cy="50" rx="20" ry="30" fill="url(#dogeGradient)" transform="rotate(20 200 50)"/>
          
          {/* Eyes */}
          <circle cx="130" cy="80" r="8" fill="#333"/>
          <circle cx="170" cy="80" r="8" fill="#333"/>
          <circle cx="132" cy="78" r="3" fill="#FFF"/>
          <circle cx="172" cy="78" r="3" fill="#FFF"/>
          
          {/* Nose */}
          <ellipse cx="150" cy="100" rx="10" ry="7" fill="#333"/>
          <ellipse cx="148" cy="98" rx="3" ry="2" fill="#666"/>
          
          {/* Mouth */}
          <path d="M140 110 Q150 120 160 110" stroke="#333" strokeWidth="2" fill="none"/>
          
          {/* Tongue */}
          <ellipse cx="150" cy="118" rx="8" ry="10" fill="#FF6B6B"/>
          
          {/* Coins on sides */}
          <circle cx="70" cy="110" r="25" fill="#FFD700" stroke="#CC9900" strokeWidth="3"/>
          <text x="62" y="118" fill="#CC9900" fontSize="24" fontWeight="bold">≡</text>
          
          <circle cx="230" cy="110" r="25" fill="#FFD700" stroke="#CC9900" strokeWidth="3"/>
          <text x="222" y="118" fill="#CC9900" fontSize="24" fontWeight="bold">$</text>
          
          {/* MemeRace text */}
          <text 
            x="150" 
            y="175" 
            textAnchor="middle" 
            fontFamily="'Fredoka One', cursive, Arial Black" 
            fontSize="36" 
            fill="url(#textGradient)"
            stroke="#FFF"
            strokeWidth="2"
            filter="url(#shadow)"
          >
            MemeRace
          </text>
        </svg>
      </div>

      <div className="loading-container">
        <div className="loading-text">Loading</div>
        <div className="loading-bar-bg">
          <div 
            className="loading-bar-fill" 
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default IntroScreen;
