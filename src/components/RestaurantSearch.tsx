import React, { useState, useCallback } from 'react';
import { SearchResult } from '../types/restaurant';
import { apiFetch } from '../utils/api';
import { GlobalLoader } from './GlobalLoader/GlobalLoader';
import { SUBWAY_LINES } from '../data/subwayLines';
import { REGION_GROUPS } from '../data/regions';
import './RestaurantSearch.scss';

const SEARCH_API_BASE = '';
const PAGE_SIZE = 20;
const HISTORY_KEY = 'lunch-select-search-history';
const MAX_HISTORY = 10;

function loadHistory(): string[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveHistory(history: string[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch { /* ignore */ }
}

function addToHistory(query: string) {
  const history = loadHistory().filter((h) => h !== query);
  history.unshift(query);
  saveHistory(history);
}

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
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [areaPrefix, setAreaPrefix] = useState('');
  const [areaMode, setAreaMode] = useState<'area' | 'gu' | 'subway'>('area');
  const [showSubwayModal, setShowSubwayModal] = useState(false);

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

    const searchQuery = areaPrefix ? `${areaPrefix} ${trimmed}` : trimmed;
    setIsSearching(true);
    setError(null);
    setAddedIds(new Set());
    try {
      const data = await fetchPage(searchQuery, 1);
      setResults(data.results);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(1);
      setShowResults(true);
      setShowHistory(false);
      setHasSearched(true);
      setSearchedQuery(searchQuery);
      addToHistory(trimmed);
      setHistory(loadHistory());
      // Log search for statistics (fire and forget)
      const parts = searchQuery.split(/\s+/);
      const region = areaPrefix || (parts.length > 1 ? parts[0] : null);
      apiFetch('/api/search-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: searchQuery, region }),
      }).catch(() => {});
    } catch (err: any) {
      setError(err.message || '검색 중 오류가 발생했습니다.');
      setResults([]);
      setTotal(0);
      setShowResults(true);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, [query, areaPrefix, fetchPage]);

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

  const handleHistorySelect = (item: string) => {
    setQuery(item);
    setShowHistory(false);
    // Trigger search immediately
    const trimmed = item.trim();
    setIsSearching(true);
    setError(null);
    setAddedIds(new Set());
    fetchPage(trimmed, 1).then((data) => {
      setResults(data.results);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(1);
      setShowResults(true);
      setHasSearched(true);
      setSearchedQuery(trimmed);
      addToHistory(trimmed);
      setHistory(loadHistory());
    }).catch(() => {
      setError('검색 중 오류가 발생했습니다.');
      setResults([]);
      setShowResults(true);
      setHasSearched(true);
    }).finally(() => setIsSearching(false));
  };

  const handleHistoryDelete = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = history.filter((h) => h !== item);
    saveHistory(updated);
    setHistory(updated);
  };

  const AREA_PRESETS = ['강남', '역삼', '서초', '홍대', '신촌', '이태원', '여의도', '종로', '잠실', '판교', '구로'];
  const [selectedRegion, setSelectedRegion] = useState(REGION_GROUPS[0].label);

  const handleAreaModeChange = (mode: 'area' | 'gu' | 'subway') => {
    setAreaMode(mode);
    if (mode === 'subway') {
      setShowSubwayModal(true);
    }
    if (mode === 'area') {
      // Keep existing areaPrefix or clear
    } else if (mode !== 'subway') {
      setAreaPrefix('');
    }
  };

  const handleSubwaySelect = (station: { name: string }) => {
    setAreaPrefix(station.name);
    setAreaMode('subway');
    setShowSubwayModal(false);
  };

  return (
    <div className="restaurant-search">
      <GlobalLoader visible={isSearching} message="맛집 검색 중..." />

      {/* 3-mode selector */}
      <div className="restaurant-search__modes">
        <button
          className={`restaurant-search__mode ${areaMode === 'area' ? 'restaurant-search__mode--active' : ''}`}
          onClick={() => handleAreaModeChange('area')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          지역
        </button>
        <button
          className={`restaurant-search__mode ${areaMode === 'gu' ? 'restaurant-search__mode--active' : ''}`}
          onClick={() => handleAreaModeChange('gu')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
          시/구 선택
        </button>
        <button
          className={`restaurant-search__mode ${areaMode === 'subway' ? 'restaurant-search__mode--active' : ''}`}
          onClick={() => handleAreaModeChange('subway')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="14" rx="3"/><line x1="4" y1="11" x2="20" y2="11"/><line x1="8" y1="17" x2="5" y2="21"/><line x1="16" y1="17" x2="19" y2="21"/><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/>
          </svg>
          지하철역
        </button>
      </div>

      {/* Area quick chips */}
      {areaMode === 'area' && (
        <div className="restaurant-search__areas">
          <button
            className={`restaurant-search__area ${!areaPrefix ? 'restaurant-search__area--active' : ''}`}
            onClick={() => setAreaPrefix('')}
          >
            전체
          </button>
          {AREA_PRESETS.map((area) => (
            <button
              key={area}
              className={`restaurant-search__area ${areaPrefix === area ? 'restaurant-search__area--active' : ''}`}
              onClick={() => setAreaPrefix(areaPrefix === area ? '' : area)}
            >
              {area}
            </button>
          ))}
        </div>
      )}

      {/* Region tabs + area chips */}
      {areaMode === 'gu' && (
        <>
          <div className="restaurant-search__region-tabs">
            {REGION_GROUPS.map((rg) => (
              <button
                key={rg.label}
                className={`restaurant-search__region-tab ${selectedRegion === rg.label ? 'restaurant-search__region-tab--active' : ''}`}
                onClick={() => { setSelectedRegion(rg.label); setAreaPrefix(''); }}
              >
                {rg.label}
              </button>
            ))}
          </div>
          <div className="restaurant-search__areas">
            {REGION_GROUPS.find((rg) => rg.label === selectedRegion)?.areas.map((a) => (
              <button
                key={a.name}
                className={`restaurant-search__area ${areaPrefix === a.name ? 'restaurant-search__area--active' : ''}`}
                onClick={() => setAreaPrefix(areaPrefix === a.name ? '' : a.name)}
              >
                {a.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Subway selected chip */}
      {areaMode === 'subway' && areaPrefix && (
        <div className="restaurant-search__subway-chip">
          <span>{areaPrefix}</span>
          <button onClick={() => setShowSubwayModal(true)}>변경</button>
        </div>
      )}
      <form className="restaurant-search__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="restaurant-search__field"
          placeholder={placeholder || "음식점 이름으로 검색하세요 (예: 역삼 김치찌개)"}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowHistory(false); }}
          onFocus={() => { if (!showResults && history.length > 0) setShowHistory(true); }}
          onBlur={() => { setTimeout(() => setShowHistory(false), 200); }}
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

      {showHistory && history.length > 0 && (
        <div className="restaurant-search__history">
          <div className="restaurant-search__history-header">
            <span>최근 검색</span>
          </div>
          {history.map((item) => (
            <button
              key={item}
              className="restaurant-search__history-item"
              onMouseDown={() => handleHistorySelect(item)}
            >
              <span className="restaurant-search__history-text">{item}</span>
              <span
                className="restaurant-search__history-delete"
                onMouseDown={(e) => handleHistoryDelete(e, item)}
              >
                &times;
              </span>
            </button>
          ))}
        </div>
      )}

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
                    {result.imageUrl && (
                      <div className="restaurant-search__item-thumb">
                        <img src={result.imageUrl} alt="" loading="lazy" />
                      </div>
                    )}
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
                    {result.imageUrl && (
                      <div className="restaurant-search__card-thumb">
                        <img src={result.imageUrl} alt="" loading="lazy" />
                      </div>
                    )}
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

      {/* Subway modal */}
      {showSubwayModal && (
        <SearchSubwayModal
          onSelect={handleSubwaySelect}
          onClose={() => setShowSubwayModal(false)}
        />
      )}
    </div>
  );
}

function SearchSubwayModal({
  onSelect,
  onClose,
}: {
  onSelect: (station: { name: string; lat: number; lng: number }) => void;
  onClose: () => void;
}) {
  const [selectedLine, setSelectedLine] = useState(SUBWAY_LINES[0].line);
  const [search, setSearch] = useState('');

  const currentLine = SUBWAY_LINES.find((l) => l.line === selectedLine)!;

  const filteredStations = search
    ? SUBWAY_LINES.flatMap((l) =>
        l.stations
          .filter((s) => s.name.includes(search))
          .map((s) => ({ ...s, line: l.line, color: l.color }))
      )
    : currentLine.stations.map((s) => ({ ...s, line: currentLine.line, color: currentLine.color }));

  return (
    <div className="subway-modal" onClick={onClose}>
      <div className="subway-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="subway-modal__header">
          <h3>지하철역 선택</h3>
          <button className="subway-modal__close" onClick={onClose}>&times;</button>
        </div>
        <input
          className="subway-modal__search"
          type="text"
          placeholder="역명 검색 (예: 강남)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {!search && (
          <div className="subway-modal__lines">
            {SUBWAY_LINES.map((l) => (
              <button
                key={l.line}
                className={`subway-modal__line ${selectedLine === l.line ? 'subway-modal__line--active' : ''}`}
                style={{
                  borderColor: selectedLine === l.line ? l.color : undefined,
                  color: selectedLine === l.line ? l.color : undefined,
                  backgroundColor: selectedLine === l.line ? `${l.color}12` : undefined,
                }}
                onClick={() => setSelectedLine(l.line)}
              >
                {l.line}
              </button>
            ))}
          </div>
        )}
        <div className="subway-modal__stations">
          {search && <div className="subway-modal__search-label">{`"${search}" 검색 결과 (${filteredStations.length}건)`}</div>}
          {filteredStations.length === 0 && (
            <div className="subway-modal__empty">검색 결과가 없습니다</div>
          )}
          <div className="subway-modal__station-grid">
            {filteredStations.map((s, i) => (
              <button
                key={`${s.line}-${s.name}-${i}`}
                className="subway-modal__station"
                onClick={() => onSelect(s)}
              >
                {search && <span className="subway-modal__station-dot" style={{ background: s.color }} />}
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>
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
