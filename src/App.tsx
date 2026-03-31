import React, { useState, useCallback, useEffect } from 'react';
import { Restaurant } from './types/restaurant';
import { useRestaurants } from './hooks/useRestaurants';
import { useCompanyLocation } from './hooks/useCompanyLocation';
import { useAuth } from './hooks/useAuth';
import { useBookmarks } from './hooks/useBookmarks';
import { CategoryTabs, CategoryTab } from './components/CategoryTabs/CategoryTabs';
import { RestaurantSearch } from './components/RestaurantSearch';
import { RestaurantList } from './components/RestaurantList';
import { LadderGame } from './components/LadderGame/LadderGame';
import { GachaGame } from './components/GachaGame/GachaGame';
import { ResultScreen } from './components/ResultScreen/ResultScreen';
import { AuthButton } from './components/AuthButton/AuthButton';
import { WordGame } from './components/WordGame/WordGame';
import { BookmarkSection } from './components/BookmarkSection/BookmarkSection';
import { VisitorCounter } from './components/VisitorCounter/VisitorCounter';
import { AdminPanel } from './components/AdminPanel/AdminPanel';
import { ArchitectureModal } from './components/ArchitectureModal/ArchitectureModal';
import { RecommendTab } from './components/RecommendTab/RecommendTab';
import { useTheme } from './hooks/useTheme';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { decodeSharedResult } from './components/SharePanel/SharePanel';
import './App.scss';

type AppPhase = 'input' | 'game' | 'result';
type GameType = 'ladder' | 'gacha';

function App() {
  const [activeTab, setActiveTab] = useState<CategoryTab>('restaurant');
  const [restaurantPhase, setRestaurantPhase] = useState<AppPhase>('input');
  const [cafePhase, setCafePhase] = useState<AppPhase>('input');
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showArch, setShowArch] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const isOnline = useOnlineStatus();
  const [gameType, setGameType] = useState<GameType>('gacha');

  // Check for shared result in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultParam = params.get('result');
    if (resultParam) {
      const shared = decodeSharedResult(resultParam);
      if (shared) {
        setWinner(shared);
        setRestaurantPhase('result');
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const companyLoc = useCompanyLocation();
  const restaurantStore = useRestaurants('lunch-select-restaurants');
  const cafeStore = useRestaurants('lunch-select-cafes');
  const { user, isLoading: authLoading, login, logout } = useAuth();
  const { bookmarks, isBookmarked, toggle: toggleBookmark } = useBookmarks(!!user);

  // Active tab state
  const isRestaurant = activeTab === 'restaurant';
  const isGame = activeTab === 'game';
  const isRecommend = activeTab === 'recommend';
  const store = isRestaurant ? restaurantStore : cafeStore;
  const phase = isRestaurant ? restaurantPhase : cafePhase;
  const setPhase = isRestaurant ? setRestaurantPhase : setCafePhase;

  const handleStartGame = useCallback(() => {
    if (store.restaurants.length >= 2) {
      setPhase('game');
    }
  }, [store.restaurants.length, setPhase]);

  const handleGameComplete = useCallback((selected: Restaurant) => {
    setWinner(selected);
    setPhase('result');
  }, [setPhase]);

  const handleRetry = useCallback(() => {
    setWinner(null);
    setPhase('game');
  }, [setPhase]);

  const handleStartOver = useCallback(() => {
    setWinner(null);
    store.clearAll();
    setPhase('input');
  }, [store, setPhase]);

  const handleBackToInput = useCallback(() => {
    setWinner(null);
    setPhase('input');
  }, [setPhase]);

  const headerTitle = isGame ? (
    <>꼬들 <span>게임</span></>
  ) : isRecommend ? (
    <>오늘 <span>뭐 먹지?</span></>
  ) : isRestaurant ? (
    <>점심 <span>뭐 먹지?</span></>
  ) : (
    <>카페 <span>어디 갈까?</span></>
  );

  const searchPlaceholder = isRestaurant
    ? '음식점 이름으로 검색하세요 (예: 역삼 김치찌개)'
    : '카페 이름으로 검색하세요 (예: 역삼 스타벅스)';

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-top">
          <div className="app__header-left">
            <VisitorCounter />
          </div>
          <div className="app__header-right">
            <button className="app__theme-btn" onClick={toggleTheme} title={theme === 'light' ? '다크 모드' : '라이트 모드'}>
              {theme === 'light' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              )}
            </button>
            {user && (user as any).isAdmin && (
              <button className="app__admin-btn" onClick={() => setShowAdmin(true)}>Admin</button>
            )}
            <AuthButton user={user} isLoading={authLoading} onLogin={login} onLogout={logout} />
          </div>
        </div>
        <div className="app__logo-row" onClick={() => { setWinner(null); setRestaurantPhase('input'); setCafePhase('input'); }}>
          <img className="app__logo-img" src="/logo.png" alt="점심 뭐 먹지?" />
          <h1 className="app__logo">{headerTitle}</h1>
        </div>
      </header>

      <main className="app__content">

        {!isOnline && (
          <div className="app__offline-banner">
            <span>&#x26A0;&#xFE0F; 오프라인 상태입니다</span>
            <span className="app__offline-hint">즐겨찾기와 저장된 목록으로 게임을 할 수 있어요</span>
          </div>
        )}

        <CategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {isGame && (
          <div className="fade-in">
            <WordGame />
          </div>
        )}

        {isRecommend && (
          <div className="fade-in">
            <RecommendTab
              onSelect={restaurantStore.addFromSearch}
              existingIds={new Set(restaurantStore.restaurants.map(r => r.id))}
            />
          </div>
        )}

        {!isGame && !isRecommend && phase === 'input' && (
          <div className="fade-in">
            <RestaurantSearch
              onSelect={store.addFromSearch}
              disabled={store.isLoading || !isOnline}
              placeholder={isOnline ? searchPlaceholder : '오프라인 - 즐겨찾기에서 추가하세요'}
              existingIds={new Set(store.restaurants.map(r => r.id))}
            />
            {store.error && <p className="app__error">{store.error}</p>}
            <BookmarkSection
              bookmarks={bookmarks}
              onAddToList={store.addFromSearch}
              existingIds={new Set(store.restaurants.map(r => r.id))}
              defaultExpanded={!isOnline}
            />
            <RestaurantList
              restaurants={store.restaurants}
              onRemove={store.removeRestaurant}
              onStartGame={handleStartGame}
              onClearAll={store.clearAll}
              isLoading={store.isLoading}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              emptyIcon={isRestaurant ? '\uD83C\uDF5A' : '\u2615'}
              emptyText={isRestaurant ? '음식점을 검색해서 추가해보세요!' : '카페를 검색해서 추가해보세요!'}
              emptyHint={isRestaurant ? '위 검색창에서 음식점 이름을 검색하세요' : '위 검색창에서 카페 이름을 검색하세요'}
            />
          </div>
        )}

        {!isGame && !isRecommend && phase === 'game' && (
          <div className="fade-in">
            <button className="app__back-button" onClick={handleBackToInput}>
              &#8592; 뒤로 가기
            </button>
            <div className="app__game-selector">
              <button
                className={`app__game-type-btn ${gameType === 'gacha' ? 'app__game-type-btn--active' : ''}`}
                onClick={() => setGameType('gacha')}
              >
                &#127922; 뽑기
              </button>
              <button
                className={`app__game-type-btn ${gameType === 'ladder' ? 'app__game-type-btn--active' : ''}`}
                onClick={() => setGameType('ladder')}
              >
                &#128206; 사다리
              </button>
            </div>
            {gameType === 'gacha' ? (
              <GachaGame
                restaurants={store.restaurants}
                onComplete={handleGameComplete}
              />
            ) : (
              <LadderGame
                restaurants={store.restaurants}
                onComplete={handleGameComplete}
              />
            )}
          </div>
        )}

        {!isGame && !isRecommend && phase === 'result' && winner && (
          <div className="fade-in">
            <ResultScreen
              winner={winner}
              restaurants={store.restaurants}
              startingPoint={companyLoc.location}
              onRetry={handleRetry}
              onStartOver={handleStartOver}
              onUpdateStartingPoint={companyLoc.updateLocation}
            />
          </div>
        )}
      </main>
      <footer className="app__footer">
        <button className="app__footer-link" onClick={() => setShowArch(true)}>Architecture</button>
        <span className="app__footer-sep">|</span>
        <a className="app__footer-link" href="https://github.com/valorjj/lunch-select" target="_blank" rel="noopener noreferrer">GitHub</a>
      </footer>
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} isSuperAdmin={user?.email === 'valorjj@gmail.com'} />}
      {showArch && <ArchitectureModal onClose={() => setShowArch(false)} />}
    </div>
  );
}

export default App;
