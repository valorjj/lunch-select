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
  onClearAll?: () => void;
  isLoading?: boolean;
  isBookmarked?: (placeId: string) => boolean;
  onToggleBookmark?: (placeId: string, restaurant: Restaurant) => void;
  emptyIcon?: string;
  emptyText?: string;
  emptyHint?: string;
}

export function RestaurantList({ restaurants, onRemove, onStartGame, onClearAll, isLoading, isBookmarked, onToggleBookmark, emptyIcon, emptyText, emptyHint }: RestaurantListProps) {
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
        <p className="restaurant-list__empty-text">
          {emptyIcon || '\uD83C\uDF5A'} {emptyText || '음식점을 검색해서 추가해보세요!'}
        </p>
      </div>
    );
  }

  return (
    <div className="restaurant-list">
      <div className="restaurant-list__header">
        <div className="restaurant-list__count">
          추가된 음식점 <strong>{restaurants.length}</strong>개
        </div>
        {onClearAll && restaurants.length > 0 && (
          <button className="restaurant-list__clear" onClick={onClearAll}>
            전체 삭제
          </button>
        )}
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

      <div className="restaurant-list__sticky-bar">
        <button
          className="restaurant-list__start-button"
          onClick={onStartGame}
          disabled={!canStartGame}
        >
          {canStartGame
            ? `${restaurants.length}개 선택됨 — 게임 시작!`
            : `음식점을 ${APP_CONFIG.minRestaurants}개 이상 추가해주세요`}
        </button>
      </div>
    </div>
  );
}
