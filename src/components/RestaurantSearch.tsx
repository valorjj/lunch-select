import React, { useState, useEffect, useRef } from 'react';
import { SearchResult } from '../types/restaurant';
import './RestaurantSearch.scss';

// Search endpoint only exists on Vercel functions, not the Spring Boot backend
const SEARCH_API_BASE = '';

interface RestaurantSearchProps {
  onSelect: (result: SearchResult) => void;
  disabled?: boolean;
}

export function RestaurantSearch({ onSelect, disabled }: RestaurantSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const response = await fetch(`${SEARCH_API_BASE}/api/search?query=${encodeURIComponent(query.trim())}`);
        if (!response.ok) {
          throw new Error('검색에 실패했습니다.');
        }
        const data: SearchResult[] = await response.json();
        setResults(data);
        setShowDropdown(true);
        setHasSearched(true);
      } catch (err: any) {
        setError(err.message || '검색 중 오류가 발생했습니다.');
        setResults([]);
        setShowDropdown(true);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    onSelect(result);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setHasSearched(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="restaurant-search" ref={wrapperRef}>
      <div className="restaurant-search__input-wrapper">
        <input
          type="text"
          className="restaurant-search__field"
          placeholder="음식점 이름으로 검색하세요 (예: 역삼 김치찌개)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        {isSearching && <span className="restaurant-search__spinner" />}
      </div>

      {showDropdown && (
        <div className="restaurant-search__dropdown">
          {error && (
            <div className="restaurant-search__error">{error}</div>
          )}
          {!error && results.length === 0 && hasSearched && (
            <div className="restaurant-search__empty">검색 결과가 없습니다</div>
          )}
          {results.length > 0 && (
            <ul className="restaurant-search__results">
              {results.map((result) => (
                <li
                  key={result.id}
                  className="restaurant-search__result-item"
                  onClick={() => handleSelect(result)}
                >
                  <div className="restaurant-search__result-name">{result.name}</div>
                  <div className="restaurant-search__result-meta">
                    {result.category && (
                      <span className="restaurant-search__result-category">{result.category}</span>
                    )}
                    <span className="restaurant-search__result-address">
                      {result.roadAddress || result.address}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
