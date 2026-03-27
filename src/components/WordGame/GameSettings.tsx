import React from 'react';

interface GameSettingsProps {
  syllableCount: number;
  onSyllableCountChange: (count: number) => void;
  theme: 'food' | 'general';
  onThemeChange: (theme: 'food' | 'general') => void;
  onNewGame: () => void;
  availableCounts?: number[];
}

export function GameSettings({
  syllableCount,
  onSyllableCountChange,
  theme,
  onThemeChange,
  onNewGame,
  availableCounts,
}: GameSettingsProps) {
  return (
    <div className="word-game__settings">
      <div className="word-game__settings-group">
        <span className="word-game__settings-label">글자 수</span>
        <div className="word-game__settings-options">
          {[2, 3, 4, 5].map((n) => {
            const available = !availableCounts || availableCounts.includes(n);
            return (
              <button
                key={n}
                className={`word-game__settings-btn ${syllableCount === n ? 'word-game__settings-btn--active' : ''}`}
                onClick={() => onSyllableCountChange(n)}
                disabled={!available}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
      <div className="word-game__settings-group">
        <span className="word-game__settings-label">주제</span>
        <div className="word-game__settings-options">
          <button
            className={`word-game__settings-btn ${theme === 'food' ? 'word-game__settings-btn--active' : ''}`}
            onClick={() => onThemeChange('food')}
          >
            음식
          </button>
          <button
            className={`word-game__settings-btn ${theme === 'general' ? 'word-game__settings-btn--active' : ''}`}
            onClick={() => onThemeChange('general')}
          >
            일반
          </button>
        </div>
      </div>
      <button className="word-game__new-game" onClick={onNewGame}>
        새 게임
      </button>
    </div>
  );
}
