"use client";
import React from 'react';
import { useGameStore } from '@/lib/gameStore';

const CategorySelect: React.FC = () => {
  const { playerCount, betCategories, selectCategory, bettingTimeLeft } = useGameStore();

  const solCategories = betCategories.filter(c => c.currency === 'SOL');
  const skrCategories = betCategories.filter(c => c.currency === 'SKR');

  return (
    <>
      {/* Players Bar */}
      <div className="players-bar">
        <span className="players-icon">👥</span>
        <span className="players-count">{playerCount} Players</span>
        <span style={{ marginLeft: 'auto' }} className="betting-countdown">⏱ {bettingTimeLeft}s</span>
      </div>

      {/* Category Selection */}
      <div className="category-select">
        <h2 className="category-title">Category</h2>

        <div className="category-grid">
          {solCategories.map((category) => (
            <button
              key={category.id}
              className="category-btn"
              onClick={() => selectCategory(category)}
            >
              {category.label}
            </button>
          ))}
          {skrCategories.map((category) => (
            <button
              key={category.id}
              className="category-btn"
              onClick={() => selectCategory(category)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default CategorySelect;
