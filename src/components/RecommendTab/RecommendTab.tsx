import React, { useState, useEffect, useCallback } from 'react';
import { SearchResult } from '../../types/restaurant';
import { useGeolocation } from '../../hooks/useGeolocation';
import './RecommendTab.scss';

interface RecommendResult extends SearchResult {
  distance: number;
}

interface RecommendTabProps {
  onSelect: (result: SearchResult) => void;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatBudget(won: number): string {
  return new Intl.NumberFormat('ko-KR').format(won) + '원';
}

export function RecommendTab({ onSelect }: RecommendTabProps) {
  const { location, isLoading: geoLoading, error: geoError, requestLocation } = useGeolocation(true);
  const [results, setResults] = useState<RecommendResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState(20000);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchRecommendations = useCallback(async (lat: number, lng: number, p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recommend?lat=${lat}&lng=${lng}&radius=1000&page=${p}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.results || []);
      setTotalPages(data.totalPages || 0);
      setPage(p);
    } catch {
      setError('주변 음식점을 불러오는 데 실패했습니다.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch when location is available
  useEffect(() => {
    if (location) {
      fetchRecommendations(location.lat, location.lng, 1);
    }
  }, [location, fetchRecommendations]);

  const handleSelect = (result: RecommendResult) => {
    onSelect(result);
    setAddedIds((prev) => new Set(prev).add(result.id));
  };

  const handlePageChange = (newPage: number) => {
    if (location) fetchRecommendations(location.lat, location.lng, newPage);
  };

  // Location permission not yet granted
  if (!location && !geoLoading && geoError) {
    return (
      <div className="recommend-tab">
        <div className="recommend-tab__permission">
          <div className="recommend-tab__permission-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <h3>위치 권한이 필요합니다</h3>
          <p>{geoError}</p>
          <button className="recommend-tab__permission-btn" onClick={requestLocation}>
            위치 허용하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="recommend-tab">
      {/* Location status */}
      <div className="recommend-tab__location">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="none">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3" fill="var(--color-surface)"/>
        </svg>
        <span>
          {geoLoading ? '위치 확인 중...' : '현재 위치 기반 추천'}
        </span>
        {location && (
          <button className="recommend-tab__refresh" onClick={requestLocation} title="위치 새로고침">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        )}
      </div>

      {/* Budget slider */}
      <div className="recommend-tab__budget">
        <label className="recommend-tab__budget-label">
          점심 예산: <strong>{formatBudget(budget)}</strong> 이하
        </label>
        <input
          type="range"
          className="recommend-tab__slider"
          min={5000}
          max={50000}
          step={1000}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
        />
        <div className="recommend-tab__budget-range">
          <span>5,000원</span>
          <span>50,000원</span>
        </div>
      </div>

      {/* Loading state */}
      {(isLoading || geoLoading) && (
        <div className="recommend-tab__loading">
          <div className="recommend-tab__spinner" />
          <span>{geoLoading ? '위치를 확인하고 있어요...' : '주변 맛집을 찾고 있어요...'}</span>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="recommend-tab__error">{error}</div>
      )}

      {/* Results grid */}
      {!isLoading && !geoLoading && results.length > 0 && (
        <>
          <div className="recommend-tab__count">
            주변 음식점 <strong>{results.length}</strong>곳
          </div>
          <div className="recommend-tab__grid">
            {results.map((r) => {
              const isAdded = addedIds.has(r.id);
              return (
                <div key={r.id} className="recommend-tab__card">
                  {r.imageUrl ? (
                    <div className="recommend-tab__card-img">
                      <img src={r.imageUrl} alt="" loading="lazy" />
                      <span className="recommend-tab__card-distance">{formatDistance(r.distance)}</span>
                    </div>
                  ) : (
                    <div className="recommend-tab__card-img recommend-tab__card-img--empty">
                      <span className="recommend-tab__card-distance">{formatDistance(r.distance)}</span>
                    </div>
                  )}
                  <div className="recommend-tab__card-body">
                    <div className="recommend-tab__card-name">{r.name}</div>
                    {r.category && (
                      <span className="recommend-tab__card-category">
                        {r.category.split('>').pop()?.trim() || r.category}
                      </span>
                    )}
                    <div className="recommend-tab__card-address">
                      {r.roadAddress || r.address}
                    </div>
                  </div>
                  <button
                    className={`recommend-tab__card-add ${isAdded ? 'recommend-tab__card-add--added' : ''}`}
                    onClick={() => handleSelect(r)}
                    disabled={isAdded}
                  >
                    {isAdded ? '추가됨' : '+ 게임에 추가'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="recommend-tab__pagination">
              <button
                disabled={page <= 1 || isLoading}
                onClick={() => handlePageChange(page - 1)}
              >
                &lsaquo; 이전
              </button>
              <span>{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages || isLoading}
                onClick={() => handlePageChange(page + 1)}
              >
                다음 &rsaquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!isLoading && !geoLoading && results.length === 0 && !error && location && (
        <div className="recommend-tab__empty">
          <span>&#x1F37D;&#xFE0F;</span>
          <p>주변 1km 이내에 음식점이 없습니다</p>
        </div>
      )}
    </div>
  );
}
