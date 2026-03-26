import React from 'react';
import { Restaurant } from '../types/restaurant';
import './RestaurantCard.scss';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onRemove: (id: string) => void;
  index: number;
  isBookmarked?: boolean;
  onToggleBookmark?: (placeId: string) => void;
}

function formatPrice(price: number | null): string {
  if (price === null) return '-';
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
}

export function RestaurantCard({ restaurant, onRemove, index, isBookmarked, onToggleBookmark }: RestaurantCardProps) {
  return (
    <div className="restaurant-card" style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="restaurant-card__actions">
        {onToggleBookmark && (
          <button
            className={`restaurant-card__bookmark ${isBookmarked ? 'restaurant-card__bookmark--active' : ''}`}
            onClick={() => onToggleBookmark(restaurant.id)}
            title={isBookmarked ? '북마크 해제' : '북마크'}
          >
            {isBookmarked ? '\u2605' : '\u2606'}
          </button>
        )}
        <button
          className="restaurant-card__remove"
          onClick={() => onRemove(restaurant.id)}
          title="삭제"
        >
          &times;
        </button>
      </div>

      {restaurant.thumbnail && (
        <div className="restaurant-card__image">
          <img src={restaurant.thumbnail} alt={restaurant.name} />
        </div>
      )}

      <div className="restaurant-card__content">
        <div className="restaurant-card__header">
          <h3 className="restaurant-card__name">{restaurant.name}</h3>
          {restaurant.category && (
            <span className="restaurant-card__category">{restaurant.category}</span>
          )}
        </div>

        {restaurant.roadAddress && (
          <p className="restaurant-card__address">{restaurant.roadAddress}</p>
        )}

        {restaurant.menuItems.length > 0 && (
          <ul className="restaurant-card__menu">
            {restaurant.menuItems.slice(0, 3).map((item, i) => (
              <li key={i} className="restaurant-card__menu-item">
                <span className="restaurant-card__menu-name">{item.name}</span>
                <span className="restaurant-card__menu-price">{formatPrice(item.price)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
