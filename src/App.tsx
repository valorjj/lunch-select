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
import { ResultScreen } from './components/ResultScreen/ResultScreen';
import { AuthButton } from './components/AuthButton/AuthButton';
import { WordGame } from './components/WordGame/WordGame';
import { BookmarkSection } from './components/BookmarkSection/BookmarkSection';
import { VisitorCounter } from './components/VisitorCounter/VisitorCounter';
import { AdminPanel } from './components/AdminPanel/AdminPanel';
import { decodeSharedResult } from './components/SharePanel/SharePanel';
import './App.scss';

type AppPhase = 'input' | 'game' | 'result';

function App() {
  const [activeTab, setActiveTab] = useState<CategoryTab>('restaurant');
  const [restaurantPhase, setRestaurantPhase] = useState<AppPhase>('input');
  const [cafePhase, setCafePhase] = useState<AppPhase>('input');
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [sharedMode, setSharedMode] = useState(false);

  // Check for shared result in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultParam = params.get('result');
    if (resultParam) {
      const shared = decodeSharedResult(resultParam);
      if (shared) {
        setWinner(shared);
        setRestaurantPhase('result');
        setSharedMode(true);
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
    setSharedMode(false);
    store.clearAll();
    setPhase('input');
  }, [store, setPhase]);

  const handleBackToInput = useCallback(() => {
    setWinner(null);
    setPhase('input');
  }, [setPhase]);

  const headerTitle = isGame ? (
    <>꼬들 <span>게임</span></>
  ) : isRestaurant ? (
    <>점심 <span>뭐 먹지?</span></>
  ) : (
    <>카페 <span>어디 갈까?</span></>
  );

  const headerDesc = isGame
    ? '한글 단어를 맞혀보세요!'
    : isRestaurant
    ? '음식점 이름을 검색해서 추가하세요'
    : '카페 이름을 검색해서 추가하세요';

  const searchPlaceholder = isRestaurant
    ? '음식점 이름으로 검색하세요 (예: 역삼 김치찌개)'
    : '카페 이름으로 검색하세요 (예: 역삼 스타벅스)';

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-top">
          <VisitorCounter />
          <div className="app__header-right">
            {user && (user as any).isAdmin && (
              <button className="app__admin-btn" onClick={() => setShowAdmin(true)}>Admin</button>
            )}
            <AuthButton user={user} isLoading={authLoading} onLogin={login} onLogout={logout} />
          </div>
        </div>
        <h1
          className="app__logo"
          onClick={() => { setWinner(null); setRestaurantPhase('input'); setCafePhase('input'); }}
        >{headerTitle}</h1>
        <p>{headerDesc}</p>
      </header>

      <main className="app__content">

        <CategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {isGame && (
          <div className="fade-in">
            <WordGame />
          </div>
        )}

        {!isGame && phase === 'input' && (
          <div className="fade-in">
            <RestaurantSearch
              onSelect={store.addFromSearch}
              disabled={store.isLoading}
              placeholder={searchPlaceholder}
            />
            {store.error && <p className="app__error">{store.error}</p>}
            <BookmarkSection
              bookmarks={bookmarks}
              onAddToList={store.addFromSearch}
              existingIds={new Set(store.restaurants.map(r => r.id))}
            />
            <RestaurantList
              restaurants={store.restaurants}
              onRemove={store.removeRestaurant}
              onStartGame={handleStartGame}
              isLoading={store.isLoading}
              isBookmarked={isBookmarked}
              onToggleBookmark={toggleBookmark}
              emptyIcon={isRestaurant ? '\uD83C\uDF5A' : '\u2615'}
              emptyText={isRestaurant ? '음식점을 검색해서 추가해보세요!' : '카페를 검색해서 추가해보세요!'}
              emptyHint={isRestaurant ? '위 검색창에서 음식점 이름을 검색하세요' : '위 검색창에서 카페 이름을 검색하세요'}
            />
          </div>
        )}

        {!isGame && phase === 'game' && (
          <div className="fade-in">
            <button className="app__back-button" onClick={handleBackToInput}>
              &#8592; 뒤로 가기
            </button>
            <LadderGame
              restaurants={store.restaurants}
              onComplete={handleGameComplete}
            />
          </div>
        )}

        {!isGame && phase === 'result' && winner && (
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
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} isSuperAdmin={user?.email === 'valorjj@gmail.com'} />}
    </div>
  );
}

export default App;
