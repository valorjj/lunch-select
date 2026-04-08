import React, { useState, useCallback, useEffect } from 'react';
import { usePoll, PollRestaurant } from '../../hooks/usePoll';
import { Restaurant } from '../../types/restaurant';
import { RestaurantSearch } from '../RestaurantSearch';
import { MapDropdown } from '../shared/MapDropdown';
import { MenuModal } from '../shared/MenuModal';
import { PollGamePhase } from './PollGamePhase';
import { PollResultPhase } from './PollResultPhase';
import './DailyPoll.scss';

type PollPhase = 'poll' | 'game' | 'result';

interface DailyPollProps {
  pollHook: ReturnType<typeof usePoll>;
}

function pollToRestaurant(pr: PollRestaurant): Restaurant {
  return {
    id: pr.naverPlaceId,
    name: pr.name,
    category: pr.category,
    menuItems: [],
    thumbnail: pr.thumbnail,
    address: pr.roadAddress,
    roadAddress: pr.roadAddress,
    lat: pr.lat,
    lng: pr.lng,
    naverMapUrl: `https://map.naver.com/p/search/${encodeURIComponent(pr.name)}`,
    naverPlaceId: pr.naverPlaceId,
  };
}

export function DailyPoll({ pollHook }: DailyPollProps) {
  const { poll, isLoading, suggest, vote, unvote, toggleJoin, finalize } = pollHook;
  const [showSearch, setShowSearch] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Phase state
  const [pollPhase, setPollPhase] = useState<PollPhase>('poll');
  const [winner, setWinner] = useState<Restaurant | null>(null);

  // Menu modal
  const [menuRestaurant, setMenuRestaurant] = useState<{ name: string; roadAddress?: string } | null>(null);

  // Show result if poll is already finalized on load
  useEffect(() => {
    if (poll?.status === 'finalized' && poll.winner && pollPhase === 'poll') {
      setWinner(pollToRestaurant(poll.winner));
      setPollPhase('result');
    }
  }, [poll?.status, poll?.winner, pollPhase]);

  const handleSuggest = async (result: { id: string }) => {
    setIsSuggesting(true);
    try {
      const success = await suggest(result.id);
      if (success) setShowSearch(false);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleStartGame = useCallback(() => {
    if (poll && poll.suggestions.length >= 2) {
      setPollPhase('game');
    }
  }, [poll]);

  const handleGameComplete = useCallback(async (selected: Restaurant) => {
    setWinner(selected);
    setPollPhase('result');
    // Auto-finalize: find the suggestion that matches the game winner
    if (poll) {
      const winningSuggestion = poll.suggestions.find(
        s => s.restaurant.naverPlaceId === selected.id
          || s.restaurant.naverPlaceId === selected.naverPlaceId
          || s.restaurant.name === selected.name
      );
      if (winningSuggestion) {
        await finalize(winningSuggestion.id);
      }
    }
  }, [poll, finalize]);

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      await finalize();
      // finalize() calls fetchPoll() internally, which updates poll state
      // The useEffect watching poll.status will auto-switch to result phase
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleBackToPoll = useCallback(() => {
    setWinner(null);
    setPollPhase('poll');
  }, []);

  if (isLoading && !poll) {
    return <div className="daily-poll__loading">투표를 불러오는 중...</div>;
  }

  // Game phase
  if (pollPhase === 'game' && poll) {
    const gameRestaurants = poll.suggestions.map(s => pollToRestaurant(s.restaurant));
    return (
      <PollGamePhase
        restaurants={gameRestaurants}
        onComplete={handleGameComplete}
        onBack={handleBackToPoll}
      />
    );
  }

  // Result phase
  if (pollPhase === 'result' && winner) {
    const isFinalized = poll?.status === 'finalized';
    return (
      <PollResultPhase
        winner={winner}
        isFinalized={isFinalized}
        onRetry={isFinalized ? undefined : () => { setWinner(null); setPollPhase('game'); }}
        onBack={handleBackToPoll}
      />
    );
  }

  const isFinalized = poll?.status === 'finalized';
  const hasVotes = poll?.suggestions.some(s => s.voteCount > 0) ?? false;

  // Poll phase (default)
  return (
    <div className="daily-poll">
      <div className="daily-poll__header">
        <h4 className="daily-poll__title">오늘의 투표</h4>
        {!isFinalized && (
          <button
            className={`daily-poll__join-btn ${poll?.amJoining ? 'daily-poll__join-btn--active' : ''}`}
            onClick={toggleJoin}
          >
            {poll?.amJoining ? '참여 중 ✓' : '나도 참여!'}
          </button>
        )}
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

      {!isFinalized && (
        <button
          className="daily-poll__suggest-btn"
          onClick={() => setShowSearch(!showSearch)}
          disabled={isSuggesting}
        >
          {showSearch ? '검색 닫기' : '+ 식당 추천하기'}
        </button>
      )}

      {showSearch && !isFinalized && (
        <div className="daily-poll__search">
          {isSuggesting && (
            <div className="daily-poll__suggesting">
              <div className="daily-poll__spinner" />
              <span>추천하는 중...</span>
            </div>
          )}
          <RestaurantSearch
            onSelect={handleSuggest}
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
        <>
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
                      {s.restaurant.roadAddress && (
                        <span className="daily-poll__suggestion-address">{s.restaurant.roadAddress}</span>
                      )}
                      <span className="daily-poll__suggestion-by">{s.suggestedBy.name}님 추천</span>
                    </div>
                  </div>
                  <div className="daily-poll__suggestion-actions">
                    <div className="daily-poll__suggestion-btns">
                      <button
                        className="daily-poll__action-btn"
                        onClick={() => setMenuRestaurant({ name: s.restaurant.name, roadAddress: s.restaurant.roadAddress })}
                        title="메뉴 보기"
                      >
                        메뉴
                      </button>
                      <MapDropdown name={s.restaurant.name} lat={s.restaurant.lat} lng={s.restaurant.lng} />
                    </div>
                    {!isFinalized && (
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
                    )}
                  </div>
                </li>
              ))}
          </ul>

          {!isFinalized && (
            <div className="daily-poll__bottom-actions">
              {poll.suggestions.length >= 2 && (
                <button className="daily-poll__start-game-btn" onClick={handleStartGame}>
                  &#127922; 게임으로 정하기!
                </button>
              )}
              {hasVotes && (
                <button
                  className="daily-poll__finalize-btn"
                  onClick={handleFinalize}
                  disabled={isFinalizing}
                >
                  {isFinalizing ? '마감 중...' : '투표 마감하기'}
                </button>
              )}
            </div>
          )}
        </>
      )}

      <MenuModal restaurant={menuRestaurant} onClose={() => setMenuRestaurant(null)} />
    </div>
  );
}
