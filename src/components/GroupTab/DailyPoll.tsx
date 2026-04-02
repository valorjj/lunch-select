import React, { useState } from 'react';
import { usePoll } from '../../hooks/usePoll';
import { RestaurantSearch } from '../RestaurantSearch';

interface DailyPollProps {
  pollHook: ReturnType<typeof usePoll>;
}

export function DailyPoll({ pollHook }: DailyPollProps) {
  const { poll, isLoading, suggest, vote, unvote, toggleJoin } = pollHook;
  const [showSearch, setShowSearch] = useState(false);

  if (isLoading && !poll) {
    return <div className="daily-poll__loading">투표를 불러오는 중...</div>;
  }

  return (
    <div className="daily-poll">
      <div className="daily-poll__header">
        <h4 className="daily-poll__title">오늘의 투표</h4>
        <button
          className={`daily-poll__join-btn ${poll?.amJoining ? 'daily-poll__join-btn--active' : ''}`}
          onClick={toggleJoin}
        >
          {poll?.amJoining ? '참여 중 ✓' : '나도 참여!'}
        </button>
      </div>

      {poll && poll.attendance.length > 0 && (
        <div className="daily-poll__attendance">
          <span className="daily-poll__attendance-label">참여 멤버:</span>
          <div className="daily-poll__attendance-list">
            {poll.attendance.map(a => (
              <span key={a.id} className="daily-poll__attendee">{a.name}</span>
            ))}
          </div>
        </div>
      )}

      <button
        className="daily-poll__suggest-btn"
        onClick={() => setShowSearch(!showSearch)}
      >
        {showSearch ? '검색 닫기' : '+ 식당 추천하기'}
      </button>

      {showSearch && (
        <div className="daily-poll__search">
          <RestaurantSearch
            onSelect={async (result) => {
              const success = await suggest(result.id);
              if (success) setShowSearch(false);
            }}
            placeholder="추천할 식당을 검색하세요"
            existingIds={new Set(poll?.suggestions.map(s => s.restaurant.naverPlaceId) || [])}
          />
        </div>
      )}

      {poll && poll.suggestions.length === 0 && (
        <div className="daily-poll__empty">
          <p>아직 추천된 식당이 없어요.</p>
          <p className="daily-poll__empty-hint">위 버튼을 눌러 식당을 추천해보세요!</p>
        </div>
      )}

      {poll && poll.suggestions.length > 0 && (
        <ul className="daily-poll__suggestions">
          {poll.suggestions
            .sort((a, b) => b.voteCount - a.voteCount)
            .map((s, idx) => (
              <li key={s.id} className={`daily-poll__suggestion ${idx === 0 && s.voteCount > 0 ? 'daily-poll__suggestion--leading' : ''}`}>
                <div className="daily-poll__suggestion-main">
                  {s.restaurant.thumbnail && (
                    <img className="daily-poll__suggestion-thumb" src={s.restaurant.thumbnail} alt={s.restaurant.name} />
                  )}
                  <div className="daily-poll__suggestion-info">
                    <span className="daily-poll__suggestion-name">{s.restaurant.name}</span>
                    <span className="daily-poll__suggestion-category">{s.restaurant.category}</span>
                    <span className="daily-poll__suggestion-by">{s.suggestedBy.name}님 추천</span>
                  </div>
                </div>
                <div className="daily-poll__suggestion-vote">
                  <button
                    className={`daily-poll__vote-btn ${s.myVote ? 'daily-poll__vote-btn--voted' : ''}`}
                    onClick={() => s.myVote ? unvote(s.id) : vote(s.id)}
                  >
                    {s.myVote ? '♥' : '♡'} {s.voteCount}
                  </button>
                  {s.voters.length > 0 && (
                    <div className="daily-poll__voters">
                      {s.voters.map(v => v.name).join(', ')}
                    </div>
                  )}
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
