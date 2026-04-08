import React from 'react';
import { Restaurant } from '../../types/restaurant';
import { MapButtons } from '../shared/MapDropdown';

interface PollResultPhaseProps {
  winner: Restaurant;
  isFinalized?: boolean;
  onRetry?: () => void;
  onBack: () => void;
}

export function PollResultPhase({ winner, isFinalized, onRetry, onBack }: PollResultPhaseProps) {
  return (
    <div className="daily-poll">
      <div className="daily-poll__result">
        <div className="daily-poll__result-celebration">
          <span className="daily-poll__result-emoji">&#127881;</span>
          <h3 className="daily-poll__result-title">오늘의 점심은!</h3>
        </div>
        <div className="daily-poll__result-card">
          {winner.thumbnail && (
            <img className="daily-poll__result-thumb" src={winner.thumbnail} alt={winner.name} />
          )}
          <div className="daily-poll__result-info">
            <span className="daily-poll__result-name">{winner.name}</span>
            <span className="daily-poll__result-category">{winner.category}</span>
            {winner.roadAddress && (
              <span className="daily-poll__result-address">{winner.roadAddress}</span>
            )}
          </div>
        </div>
        {winner.lat && winner.lng && (
          <div className="daily-poll__result-maps">
            <MapButtons name={winner.name} lat={winner.lat} lng={winner.lng} />
          </div>
        )}
        <div className="daily-poll__result-actions">
          {onRetry && (
            <button className="daily-poll__result-retry" onClick={onRetry}>
              다시 하기
            </button>
          )}
          <button className="daily-poll__result-back" onClick={onBack}>
            {isFinalized ? '투표 보기' : '투표로 돌아가기'}
          </button>
        </div>
      </div>
    </div>
  );
}
