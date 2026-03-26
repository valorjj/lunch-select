import React, { useState, useCallback } from 'react';
import { Restaurant } from './types/restaurant';
import { useRestaurants } from './hooks/useRestaurants';
import { UrlInput } from './components/UrlInput';
import { RestaurantList } from './components/RestaurantList';
import { LadderGame } from './components/LadderGame/LadderGame';
import { ResultScreen } from './components/ResultScreen/ResultScreen';
import { DEFAULT_OFFICE } from './config/defaults';
import './App.scss';

type AppPhase = 'input' | 'game' | 'result';

interface StartingPoint {
  lat: number;
  lng: number;
  name: string;
}

function App() {
  const [phase, setPhase] = useState<AppPhase>('input');
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [startingPoint, setStartingPoint] = useState<StartingPoint>({
    lat: DEFAULT_OFFICE.lat,
    lng: DEFAULT_OFFICE.lng,
    name: DEFAULT_OFFICE.name,
  });

  const { restaurants, isLoading, error, addFromUrl, removeRestaurant, clearAll } = useRestaurants();

  const handleStartGame = useCallback(() => {
    if (restaurants.length >= 2) {
      setPhase('game');
    }
  }, [restaurants.length]);

  const handleGameComplete = useCallback((selected: Restaurant) => {
    setWinner(selected);
    setPhase('result');
  }, []);

  const handleRetry = useCallback(() => {
    setWinner(null);
    setPhase('game');
  }, []);

  const handleStartOver = useCallback(() => {
    setWinner(null);
    clearAll();
    setPhase('input');
  }, [clearAll]);

  const handleBackToInput = useCallback(() => {
    setWinner(null);
    setPhase('input');
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <h1>
          점심 <span>뭐 먹지?</span>
        </h1>
        <p>네이버 지도에서 음식점을 검색하고 주소창 URL을 복사해서 추가하세요</p>
      </header>

      <main className="app__content">
        {phase === 'input' && (
          <div className="fade-in">
            <UrlInput
              onAdd={addFromUrl}
              isLoading={isLoading}
              error={error}
            />
            <RestaurantList
              restaurants={restaurants}
              onRemove={removeRestaurant}
              onStartGame={handleStartGame}
              isLoading={isLoading}
            />
          </div>
        )}

        {phase === 'game' && (
          <div className="fade-in">
            <button className="app__back-button" onClick={handleBackToInput}>
              &#8592; 뒤로 가기
            </button>
            <LadderGame
              restaurants={restaurants}
              onComplete={handleGameComplete}
            />
          </div>
        )}

        {phase === 'result' && winner && (
          <div className="fade-in">
            <ResultScreen
              winner={winner}
              startingPoint={startingPoint}
              onRetry={handleRetry}
              onStartOver={handleStartOver}
              onUpdateStartingPoint={setStartingPoint}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
