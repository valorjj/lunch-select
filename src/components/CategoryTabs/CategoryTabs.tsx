import React from 'react';
import './CategoryTabs.scss';

export type CategoryTab = 'restaurant' | 'cafe';

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
    </div>
  );
}
