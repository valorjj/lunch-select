import React, { useState, useCallback } from 'react';
import { SearchResult } from '../types/restaurant';
import './RestaurantSearch.scss';

const SEARCH_API_BASE = '';
const PAGE_SIZE = 5;

interface SearchResponse {
  results: SearchResult[];
  total: number;
  start: number;
}

interface RestaurantSearchProps {
  onSelect: (result: SearchResult) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function RestaurantSearch({ onSelect, disabled, placeholder }: RestaurantSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [nextStart, setNextStart] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [searchedQuery, setSearchedQuery] = useState('');

  const fetchResults = useCallback(async (searchQuery: string, start: number) => {
    const response = await fetch(
      `${SEARCH_API_BASE}/api/search?query=${encodeURIComponent(searchQuery)}&start=${start}`
    );
    if (!response.ok) throw new Error('검색에 실패했습니다.');
    const data: SearchResponse = await response.json();
    return data;
  }, []);

  const doSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError('검색어를 2글자 이상 입력해주세요.');
      return;
    }

    setIsSearching(true);
    setError(null);
    setAddedIds(new Set());
    try {
      const data = await fetchResults(trimmed, 1);
      setResults(data.results);
      setTotal(data.total);
      setNextStart(1 + PAGE_SIZE);
      setShowResults(true);
      setHasSearched(true);
      setSearchedQuery(trimmed);
    } catch (err: any) {
      setError(err.message || '검색 중 오류가 발생했습니다.');
      setResults([]);
      setTotal(0);
      setShowResults(true);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, [query, fetchResults]);

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const data = await fetchResults(searchedQuery, nextStart);
      setResults((prev) => [...prev, ...data.results]);
      setNextStart((prev) => prev + PAGE_SIZE);
    } catch {
      // silent
    } finally {
      setIsLoadingMore(false);
    }
  }, [searchedQuery, nextStart, fetchResults]);

  const handleSelect = (result: SearchResult) => {
    onSelect(result);
    setAddedIds((prev) => new Set(prev).add(result.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSearching && !disabled) {
      doSearch();
    }
  };

  const handleClose = () => {
    setShowResults(false);
    setResults([]);
    setHasSearched(false);
  };

  const hasMore = results.length < total;

  return (
    <div className="restaurant-search">
      <form className="restaurant-search__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="restaurant-search__field"
          placeholder={placeholder || "음식점 이름으로 검색하세요 (예: 역삼 김치찌개)"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled || isSearching}
        />
        <button
          type="submit"
          className="restaurant-search__button"
          disabled={!query.trim() || isSearching || disabled}
        >
          {isSearching ? <span className="restaurant-search__spinner" /> : '검색'}
        </button>
      </form>

      {showResults && (
        <div className="restaurant-search__panel">
          <div className="restaurant-search__panel-header">
            {error ? (
              <span className="restaurant-search__error-text">{error}</span>
            ) : results.length > 0 ? (
              <span className="restaurant-search__count">
                검색 결과 <strong>{total.toLocaleString()}</strong>건
              </span>
            ) : hasSearched ? (
              <span className="restaurant-search__count">검색 결과가 없습니다</span>
            ) : null}
            <button className="restaurant-search__close" onClick={handleClose}>
              닫기
            </button>
          </div>

          {results.length > 0 && (
            <div className="restaurant-search__list">
              {results.map((result) => {
                const isAdded = addedIds.has(result.id);
                return (
                  <div key={result.id} className="restaurant-search__item">
                    <div className="restaurant-search__item-body">
                      <div className="restaurant-search__item-name">{result.name}</div>
                      <div className="restaurant-search__item-meta">
                        {result.category && (
                          <span className="restaurant-search__item-category">{result.category}</span>
                        )}
                        <span className="restaurant-search__item-address">
                          {result.roadAddress || result.address}
                        </span>
                      </div>
                      {result.phone && (
                        <div className="restaurant-search__item-phone">{result.phone}</div>
                      )}
                    </div>
                    <button
                      className={`restaurant-search__item-add ${isAdded ? 'restaurant-search__item-add--added' : ''}`}
                      onClick={() => handleSelect(result)}
                      disabled={isAdded}
                    >
                      {isAdded ? '✓' : '+'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && (
            <button
              className="restaurant-search__load-more"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <span className="restaurant-search__spinner restaurant-search__spinner--small" />
              ) : (
                '더 보기'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
