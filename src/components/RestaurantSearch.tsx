import React, { useState, useCallback } from 'react';
import { SearchResult } from '../types/restaurant';
import './RestaurantSearch.scss';

const SEARCH_API_BASE = '';
const PAGE_SIZE = 20;

type ViewMode = 'list' | 'card';

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
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
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [searchedQuery, setSearchedQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const fetchPage = useCallback(async (searchQuery: string, page: number) => {
    const response = await fetch(
      `${SEARCH_API_BASE}/api/search?query=${encodeURIComponent(searchQuery)}&page=${page}&displayCount=${PAGE_SIZE}`
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
      const data = await fetchPage(trimmed, 1);
      setResults(data.results);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(1);
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
  }, [query, fetchPage]);

  const goToPage = useCallback(async (page: number) => {
    setIsSearching(true);
    try {
      const data = await fetchPage(searchedQuery, page);
      setResults(data.results);
      setCurrentPage(page);
    } catch {
      // silent
    } finally {
      setIsSearching(false);
    }
  }, [searchedQuery, fetchPage]);

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
            <div className="restaurant-search__header-left">
              {error ? (
                <span className="restaurant-search__error-text">{error}</span>
              ) : results.length > 0 ? (
                <span className="restaurant-search__count">
                  검색 결과 <strong>{total.toLocaleString()}</strong>건
                </span>
              ) : hasSearched ? (
                <span className="restaurant-search__count">검색 결과가 없습니다</span>
              ) : null}
            </div>
            <div className="restaurant-search__header-right">
              {results.length > 0 && (
                <div className="restaurant-search__view-toggle">
                  <button
                    className={`restaurant-search__view-btn ${viewMode === 'list' ? 'restaurant-search__view-btn--active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="리스트 보기"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="0" y="1" width="16" height="2.5" rx="1" />
                      <rect x="0" y="6.75" width="16" height="2.5" rx="1" />
                      <rect x="0" y="12.5" width="16" height="2.5" rx="1" />
                    </svg>
                  </button>
                  <button
                    className={`restaurant-search__view-btn ${viewMode === 'card' ? 'restaurant-search__view-btn--active' : ''}`}
                    onClick={() => setViewMode('card')}
                    title="카드 보기"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="0" y="0" width="7" height="7" rx="1.5" />
                      <rect x="9" y="0" width="7" height="7" rx="1.5" />
                      <rect x="0" y="9" width="7" height="7" rx="1.5" />
                      <rect x="9" y="9" width="7" height="7" rx="1.5" />
                    </svg>
                  </button>
                </div>
              )}
              <button className="restaurant-search__close" onClick={handleClose}>
                닫기
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <div className={`restaurant-search__results restaurant-search__results--${viewMode}`}>
              {results.map((result) => {
                const isAdded = addedIds.has(result.id);
                return viewMode === 'list' ? (
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
                    </div>
                    <button
                      className={`restaurant-search__item-add ${isAdded ? 'restaurant-search__item-add--added' : ''}`}
                      onClick={() => handleSelect(result)}
                      disabled={isAdded}
                    >
                      {isAdded ? '✓' : '+'}
                    </button>
                  </div>
                ) : (
                  <div key={result.id} className="restaurant-search__card">
                    <div className="restaurant-search__card-body">
                      <div className="restaurant-search__card-name">{result.name}</div>
                      {result.category && (
                        <span className="restaurant-search__card-category">{result.category}</span>
                      )}
                      <div className="restaurant-search__card-address">
                        {result.roadAddress || result.address}
                      </div>
                      {result.phone && (
                        <div className="restaurant-search__card-phone">{result.phone}</div>
                      )}
                    </div>
                    <button
                      className={`restaurant-search__card-add ${isAdded ? 'restaurant-search__card-add--added' : ''}`}
                      onClick={() => handleSelect(result)}
                      disabled={isAdded}
                    >
                      {isAdded ? '추가됨' : '+ 추가'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              disabled={isSearching}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled: boolean;
}) {
  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <div className="search-pagination">
      <button
        className="search-pagination__btn search-pagination__btn--arrow"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage <= 1}
      >
        &#8249;
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="search-pagination__ellipsis">...</span>
        ) : (
          <button
            key={p}
            className={`search-pagination__btn ${p === currentPage ? 'search-pagination__btn--active' : ''}`}
            onClick={() => onPageChange(p as number)}
            disabled={disabled}
          >
            {p}
          </button>
        )
      )}
      <button
        className="search-pagination__btn search-pagination__btn--arrow"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage >= totalPages}
      >
        &#8250;
      </button>
    </div>
  );
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');
  pages.push(total);

  return pages;
}
