import React, { useState, useCallback } from 'react';
import { usePoll, PollRestaurant } from '../../hooks/usePoll';
import { Restaurant } from '../../types/restaurant';
import { RestaurantSearch } from '../RestaurantSearch';
import { LadderGame } from '../LadderGame/LadderGame';
import { GachaGame } from '../GachaGame/GachaGame';

type GameType = 'gacha' | 'ladder';
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

function formatPrice(price: number | null): string {
  if (price === null) return '-';
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
}

export function DailyPoll({ pollHook }: DailyPollProps) {
  const { poll, isLoading, suggest, vote, unvote, toggleJoin } = pollHook;
  const [showSearch, setShowSearch] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Game state
  const [pollPhase, setPollPhase] = useState<PollPhase>('poll');
  const [gameType, setGameType] = useState<GameType>('gacha');
  const [winner, setWinner] = useState<Restaurant | null>(null);

  // Menu modal state
  const [menuModal, setMenuModal] = useState<{
    name: string;
    items: { name: string; price: number | null }[];
    rating: number | null;
    reviewCount: number | null;
    loading: boolean;
    error: string | null;
  } | null>(null);

  // Map dropdown state
  const [openMapId, setOpenMapId] = useState<number | null>(null);

  const handleFetchMenu = async (restaurant: PollRestaurant) => {
    setMenuModal({ name: restaurant.name, items: [], rating: null, reviewCount: null, loading: true, error: null });
    try {
      const apiUrl = `/api/place?name=${encodeURIComponent(restaurant.name)}&address=${encodeURIComponent(restaurant.roadAddress || '')}`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMenuModal({
        name: data.name || restaurant.name,
        items: data.menuItems || [],
        rating: data.rating ?? null,
        reviewCount: data.reviewCount ?? null,
        loading: false,
        error: data.menuItems?.length > 0 ? null : '등록된 메뉴가 없습니다.',
      });
    } catch {
      setMenuModal({ name: restaurant.name, items: [], rating: null, reviewCount: null, loading: false, error: '메뉴 정보를 가져올 수 없습니다.' });
    }
  };

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

  const handleGameComplete = useCallback((selected: Restaurant) => {
    setWinner(selected);
    setPollPhase('result');
  }, []);

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
      <div className="daily-poll">
        <div className="daily-poll__header">
          <button className="daily-poll__back-btn" onClick={handleBackToPoll}>&#8592; 투표로 돌아가기</button>
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
          <GachaGame restaurants={gameRestaurants} onComplete={handleGameComplete} />
        ) : (
          <LadderGame restaurants={gameRestaurants} onComplete={handleGameComplete} />
        )}
      </div>
    );
  }

  // Result phase
  if (pollPhase === 'result' && winner) {
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
              <a className="daily-poll__map-app daily-poll__map-app--naver" href={`nmap://place?lat=${winner.lat}&lng=${winner.lng}&name=${encodeURIComponent(winner.name)}&appname=com.lunchselect`} onClick={() => { setTimeout(() => { window.open(`https://map.naver.com/p/search/${encodeURIComponent(winner.name)}`, '_blank'); }, 500); }}>
                <span>N</span>네이버지도
              </a>
              <a className="daily-poll__map-app daily-poll__map-app--kakao" href={`kakaomap://look?p=${winner.lat},${winner.lng}`} onClick={() => { setTimeout(() => { window.open(`https://map.kakao.com/link/map/${encodeURIComponent(winner.name)},${winner.lat},${winner.lng}`, '_blank'); }, 500); }}>
                <span>K</span>카카오맵
              </a>
              <a className="daily-poll__map-app daily-poll__map-app--tmap" href={`tmap://route?goalx=${winner.lng}&goaly=${winner.lat}&goalname=${encodeURIComponent(winner.name)}`}>
                <span>T</span>티맵
              </a>
            </div>
          )}
          <div className="daily-poll__result-actions">
            <button className="daily-poll__result-retry" onClick={() => { setWinner(null); setPollPhase('game'); }}>
              다시 하기
            </button>
            <button className="daily-poll__result-back" onClick={handleBackToPoll}>
              투표로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Poll phase (default)
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
        disabled={isSuggesting}
      >
        {showSearch ? '검색 닫기' : '+ 식당 추천하기'}
      </button>

      {showSearch && (
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
                        onClick={() => handleFetchMenu(s.restaurant)}
                        title="메뉴 보기"
                      >
                        메뉴
                      </button>
                      <div className="daily-poll__map-dropdown">
                        <button
                          className="daily-poll__action-btn"
                          onClick={() => setOpenMapId(openMapId === s.id ? null : s.id)}
                        >
                          지도
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points={openMapId === s.id ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
                          </svg>
                        </button>
                        {openMapId === s.id && (
                          <div className="daily-poll__map-popup">
                            <a className="daily-poll__map-popup-item" href={`nmap://place?lat=${s.restaurant.lat}&lng=${s.restaurant.lng}&name=${encodeURIComponent(s.restaurant.name)}&appname=com.lunchselect`} onClick={() => { setTimeout(() => { window.open(`https://map.naver.com/p/search/${encodeURIComponent(s.restaurant.name)}`, '_blank'); }, 500); }}>
                              <span className="daily-poll__map-dot daily-poll__map-dot--naver">N</span>네이버지도
                            </a>
                            <a className="daily-poll__map-popup-item" href={`kakaomap://look?p=${s.restaurant.lat},${s.restaurant.lng}`} onClick={() => { setTimeout(() => { window.open(`https://map.kakao.com/link/map/${encodeURIComponent(s.restaurant.name)},${s.restaurant.lat},${s.restaurant.lng}`, '_blank'); }, 500); }}>
                              <span className="daily-poll__map-dot daily-poll__map-dot--kakao">K</span>카카오맵
                            </a>
                            <a className="daily-poll__map-popup-item" href={`tmap://route?goalx=${s.restaurant.lng}&goaly=${s.restaurant.lat}&goalname=${encodeURIComponent(s.restaurant.name)}`}>
                              <span className="daily-poll__map-dot daily-poll__map-dot--tmap">T</span>티맵
                            </a>
                          </div>
                        )}
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
                  </div>
                </li>
              ))}
          </ul>

          {poll.suggestions.length >= 2 && (
            <button className="daily-poll__start-game-btn" onClick={handleStartGame}>
              &#127922; 게임으로 정하기!
            </button>
          )}
        </>
      )}

      {/* Menu modal */}
      {menuModal && (
        <div className="daily-poll__modal-overlay" onClick={() => setMenuModal(null)}>
          <div className="daily-poll__modal" onClick={(e) => e.stopPropagation()}>
            <div className="daily-poll__modal-header">
              <div>
                <h3>{menuModal.name}</h3>
                {menuModal.rating !== null && menuModal.rating > 0 && (
                  <div className="daily-poll__modal-rating">
                    <span className="daily-poll__modal-star">{'\u2605'}</span>
                    <span className="daily-poll__modal-score">{menuModal.rating.toFixed(2)}</span>
                    {menuModal.reviewCount !== null && (
                      <span className="daily-poll__modal-reviews">
                        (리뷰 {menuModal.reviewCount.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => setMenuModal(null)}>&times;</button>
            </div>
            {menuModal.loading && (
              <div className="daily-poll__modal-loading">
                <div className="daily-poll__spinner" />
                <span>메뉴를 불러오는 중...</span>
              </div>
            )}
            {menuModal.error && !menuModal.loading && (
              <div className="daily-poll__modal-error">{menuModal.error}</div>
            )}
            {menuModal.items.length > 0 && (
              <ul className="daily-poll__modal-menu">
                {menuModal.items.map((item, i) => (
                  <li key={i}>
                    <span>{item.name}</span>
                    <span>{formatPrice(item.price)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
