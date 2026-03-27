import React, { useState } from 'react';
import { Restaurant, SearchResult } from '../../types/restaurant';
import './BookmarkSection.scss';

interface BookmarkSectionProps {
  bookmarks: Restaurant[];
  onAddToList: (result: SearchResult) => void;
  existingIds: Set<string>;
}

export function BookmarkSection({ bookmarks, onAddToList, existingIds }: BookmarkSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (bookmarks.length === 0) return null;

  const handleAdd = (bookmark: Restaurant) => {
    const result: SearchResult = {
      id: bookmark.id,
      name: bookmark.name,
      category: bookmark.category,
      address: bookmark.address,
      roadAddress: bookmark.roadAddress,
      lat: bookmark.lat,
      lng: bookmark.lng,
      phone: bookmark.phone || '',
      naverMapUrl: bookmark.naverMapUrl,
    };
    onAddToList(result);
  };

  return (
    <div className="bookmark-section">
      <button
        className="bookmark-section__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="bookmark-section__toggle-icon">{isExpanded ? '▾' : '▸'}</span>
        <span className="bookmark-section__toggle-star">&#9733;</span>
        즐겨찾기
        <span className="bookmark-section__count">{bookmarks.length}</span>
      </button>

      {isExpanded && (
        <div className="bookmark-section__list">
          {bookmarks.map((bookmark) => {
            const alreadyAdded = existingIds.has(bookmark.id);
            return (
              <div key={bookmark.id} className="bookmark-section__item">
                <div className="bookmark-section__info">
                  <span className="bookmark-section__name">{bookmark.name}</span>
                  {bookmark.category && (
                    <span className="bookmark-section__category">{bookmark.category}</span>
                  )}
                </div>
                <button
                  className="bookmark-section__add"
                  onClick={() => handleAdd(bookmark)}
                  disabled={alreadyAdded}
                >
                  {alreadyAdded ? '추가됨' : '+ 추가'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
