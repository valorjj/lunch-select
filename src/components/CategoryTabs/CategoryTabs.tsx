import React from 'react';
import './CategoryTabs.scss';

export type CategoryTab = 'restaurant' | 'cafe' | 'game' | 'recommend';

interface CategoryTabsProps {
  activeTab: CategoryTab;
  onTabChange: (tab: CategoryTab) => void;
}

export function CategoryTabs({ activeTab, onTabChange }: CategoryTabsProps) {
  return (
    <div className="category-tabs">
      <button
        className={`category-tabs__tab ${activeTab === 'restaurant' ? 'category-tabs__tab--active' : ''}`}
        onClick={() => onTabChange('restaurant')}
      >
        음식점
      </button>
      <button
        className={`category-tabs__tab ${activeTab === 'cafe' ? 'category-tabs__tab--active' : ''}`}
        onClick={() => onTabChange('cafe')}
      >
        카페
      </button>
      <button
        className={`category-tabs__tab ${activeTab === 'recommend' ? 'category-tabs__tab--active' : ''}`}
        onClick={() => onTabChange('recommend')}
      >
        추천
      </button>
      <button
        className={`category-tabs__tab ${activeTab === 'game' ? 'category-tabs__tab--active' : ''}`}
        onClick={() => onTabChange('game')}
      >
        꼬들 게임
      </button>
    </div>
  );
}
