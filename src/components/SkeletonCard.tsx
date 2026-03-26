import React from 'react';
import './RestaurantCard.scss';

export function SkeletonCard() {
  return (
    <div className="restaurant-card restaurant-card--skeleton">
      <div className="restaurant-card__image skeleton-shimmer" />
      <div className="restaurant-card__content">
        <div className="restaurant-card__header">
          <div className="skeleton-bar skeleton-bar--title" />
          <div className="skeleton-bar skeleton-bar--badge" />
        </div>
        <div className="skeleton-bar skeleton-bar--address" />
        <div className="restaurant-card__menu">
          <div className="skeleton-bar skeleton-bar--menu" />
          <div className="skeleton-bar skeleton-bar--menu" />
          <div className="skeleton-bar skeleton-bar--menu" />
        </div>
      </div>
    </div>
  );
}
