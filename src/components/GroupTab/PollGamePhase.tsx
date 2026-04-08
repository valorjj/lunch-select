import React, { useState } from 'react';
import { Restaurant } from '../../types/restaurant';
import { LadderGame } from '../LadderGame/LadderGame';
import { GachaGame } from '../GachaGame/GachaGame';

type GameType = 'gacha' | 'ladder';

interface PollGamePhaseProps {
  restaurants: Restaurant[];
  onComplete: (winner: Restaurant) => void;
  onBack: () => void;
}

export function PollGamePhase({ restaurants, onComplete, onBack }: PollGamePhaseProps) {
  const [gameType, setGameType] = useState<GameType>('gacha');

  return (
    <div className="daily-poll">
      <div className="daily-poll__header">
        <button className="daily-poll__back-btn" onClick={onBack}>&#8592; 투표로 돌아가기</button>
      </div>
      <div className="daily-poll__game-selector">
        <button
          className={`daily-poll__game-type-btn ${gameType === 'gacha' ? 'daily-poll__game-type-btn--active' : ''}`}
          onClick={() => setGameType('gacha')}
        >
          &#127922; 뽑기
        </button>
        <button
          className={`daily-poll__game-type-btn ${gameType === 'ladder' ? 'daily-poll__game-type-btn--active' : ''}`}
          onClick={() => setGameType('ladder')}
        >
          &#128206; 사다리
        </button>
      </div>
      {gameType === 'gacha' ? (
        <GachaGame restaurants={restaurants} onComplete={onComplete} />
      ) : (
        <LadderGame restaurants={restaurants} onComplete={onComplete} />
      )}
    </div>
  );
}
