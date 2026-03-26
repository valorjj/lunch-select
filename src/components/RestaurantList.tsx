import React from 'react';
import { Restaurant } from '../types/restaurant';
import { RestaurantCard } from './RestaurantCard';
import { SkeletonCard } from './SkeletonCard';
import { APP_CONFIG } from '../config/defaults';
import './RestaurantList.scss';

interface RestaurantListProps {
  restaurants: Restaurant[];
  onRemove: (id: string) => void;
  onStartGame: () => void;
  isLoading?: boolean;
  isBookmarked?: (placeId: string) => boolean;
  onToggleBookmark?: (placeId: string) => void;
}

export function RestaurantList({ restaurants, onRemove, onStartGame, isLoading, isBookmarked, onToggleBookmark }: RestaurantListProps) {
  const canStartGame = restaurants.length >= APP_CONFIG.minRestaurants;

  if (restaurants.length === 0 && isLoading) {
    return (
      <div className="restaurant-list">
        <div className="restaurant-list__grid">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="restaurant-list__empty">
        <div className="restaurant-list__empty-icon">&#127858;</div>
        <p className="restaurant-list__empty-text">
          네이버 지도에서 음식점 URL을 추가해보세요!
        </p>
        <p className="restaurant-list__empty-hint">
          네이버 지도에서 음식점을 검색하고 브라우저 주소창의 URL을 복사해서 위에 붙여넣기 하세요
        </p>
      </div>
    );
  }

  return (
    <div className="restaurant-list">
      <div className="restaurant-list__count">
        추가된 음식점 <strong>{restaurants.length}</strong>개
      </div>

      <div className="restaurant-list__grid">
        {restaurants.map((restaurant, index) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            onRemove={onRemove}
            index={index}
            isBookmarked={isBookmarked ? isBookmarked(restaurant.id) : undefined}
            onToggleBookmark={onToggleBookmark}
          />
        ))}
        {isLoading && <SkeletonCard />}
      </div>

      <button
        className="restaurant-list__start-button"
        onClick={onStartGame}
        disabled={!canStartGame}
      >
        {canStartGame
          ? '사다리 타기 시작!'
          : `음식점을 ${APP_CONFIG.minRestaurants}개 이상 추가해주세요`}
      </button>
    </div>
  );
}
