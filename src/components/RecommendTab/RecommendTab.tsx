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

type LocationMode = 'gps' | 'gu' | 'subway';

interface PresetLocation {
  name: string;
  lat: number;
  lng: number;
}

const SEOUL_GU: PresetLocation[] = [
  { name: '강남구', lat: 37.5172, lng: 127.0473 },
  { name: '강동구', lat: 37.5301, lng: 127.1238 },
  { name: '강북구', lat: 37.6396, lng: 127.0255 },
  { name: '강서구', lat: 37.5510, lng: 126.8495 },
  { name: '관악구', lat: 37.4784, lng: 126.9516 },
  { name: '광진구', lat: 37.5385, lng: 127.0823 },
  { name: '구로구', lat: 37.4954, lng: 126.8875 },
  { name: '금천구', lat: 37.4569, lng: 126.8956 },
  { name: '노원구', lat: 37.6542, lng: 127.0568 },
  { name: '도봉구', lat: 37.6688, lng: 127.0472 },
  { name: '동대문구', lat: 37.5744, lng: 127.0396 },
  { name: '동작구', lat: 37.5124, lng: 126.9393 },
  { name: '마포구', lat: 37.5663, lng: 126.9018 },
  { name: '서대문구', lat: 37.5791, lng: 126.9368 },
  { name: '서초구', lat: 37.4837, lng: 127.0324 },
  { name: '성동구', lat: 37.5634, lng: 127.0370 },
  { name: '성북구', lat: 37.5894, lng: 127.0167 },
  { name: '송파구', lat: 37.5146, lng: 127.1060 },
  { name: '양천구', lat: 37.5170, lng: 126.8665 },
  { name: '영등포구', lat: 37.5264, lng: 126.8963 },
  { name: '용산구', lat: 37.5324, lng: 126.9906 },
  { name: '은평구', lat: 37.6027, lng: 126.9291 },
  { name: '종로구', lat: 37.5735, lng: 126.9790 },
  { name: '중구', lat: 37.5641, lng: 126.9979 },
  { name: '중랑구', lat: 37.6066, lng: 127.0927 },
];

const SUBWAY_STATIONS: PresetLocation[] = [
  { name: '강남역', lat: 37.4979, lng: 127.0276 },
  { name: '역삼역', lat: 37.5007, lng: 127.0365 },
  { name: '삼성역', lat: 37.5089, lng: 127.0637 },
  { name: '선릉역', lat: 37.5045, lng: 127.0490 },
  { name: '교대역', lat: 37.4934, lng: 127.0145 },
  { name: '잠실역', lat: 37.5133, lng: 127.1001 },
  { name: '홍대입구역', lat: 37.5571, lng: 126.9246 },
  { name: '합정역', lat: 37.5497, lng: 126.9138 },
  { name: '신촌역', lat: 37.5553, lng: 126.9372 },
  { name: '이태원역', lat: 37.5345, lng: 126.9945 },
  { name: '여의도역', lat: 37.5217, lng: 126.9243 },
  { name: '종각역', lat: 37.5700, lng: 126.9830 },
  { name: '을지로입구역', lat: 37.5660, lng: 126.9822 },
  { name: '시청역', lat: 37.5657, lng: 126.9770 },
  { name: '광화문역', lat: 37.5711, lng: 126.9764 },
  { name: '신림역', lat: 37.4841, lng: 126.9298 },
  { name: '건대입구역', lat: 37.5404, lng: 127.0694 },
  { name: '왕십리역', lat: 37.5614, lng: 127.0371 },
  { name: '신논현역', lat: 37.5049, lng: 127.0253 },
  { name: '판교역', lat: 37.3948, lng: 127.1112 },
  { name: '구로디지털단지역', lat: 37.4851, lng: 126.9016 },
  { name: '가산디지털단지역', lat: 37.4816, lng: 126.8826 },
  { name: '사당역', lat: 37.4766, lng: 126.9816 },
  { name: '노량진역', lat: 37.5133, lng: 126.9427 },
];

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatBudget(won: number): string {
  return new Intl.NumberFormat('ko-KR').format(won) + '원';
}

export function RecommendTab({ onSelect }: RecommendTabProps) {
  const { location: gpsLocation, isLoading: geoLoading, error: geoError, requestLocation } = useGeolocation(false);
  const [locationMode, setLocationMode] = useState<LocationMode>('gps');
  const [selectedPreset, setSelectedPreset] = useState<PresetLocation | null>(null);
  const [results, setResults] = useState<RecommendResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState(20000);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // The active location based on mode
  const activeLocation = locationMode === 'gps' ? gpsLocation : selectedPreset;

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

  // Fetch when active location changes
  useEffect(() => {
    if (activeLocation) {
      fetchRecommendations(activeLocation.lat, activeLocation.lng, 1);
    }
  }, [activeLocation, fetchRecommendations]);

  // Request GPS when GPS mode is selected
  useEffect(() => {
    if (locationMode === 'gps' && !gpsLocation && !geoLoading) {
      requestLocation();
    }
  }, [locationMode, gpsLocation, geoLoading, requestLocation]);

  const handleModeChange = (mode: LocationMode) => {
    setLocationMode(mode);
    setSelectedPreset(null);
    setResults([]);
    setPage(1);
  };

  const handlePresetSelect = (preset: PresetLocation) => {
    setSelectedPreset(preset);
  };

  const handleSelect = (result: RecommendResult) => {
    onSelect(result);
    setAddedIds((prev) => new Set(prev).add(result.id));
  };

  const handlePageChange = (newPage: number) => {
    if (activeLocation) fetchRecommendations(activeLocation.lat, activeLocation.lng, newPage);
  };

  const locationLabel = locationMode === 'gps'
    ? (geoLoading ? '위치 확인 중...' : '현재 위치 기반 추천')
    : selectedPreset
    ? `${selectedPreset.name} 주변 추천`
    : '지역을 선택해주세요';

  return (
    <div className="recommend-tab">
      {/* Location mode selector */}
      <div className="recommend-tab__modes">
        <button
          className={`recommend-tab__mode ${locationMode === 'gps' ? 'recommend-tab__mode--active' : ''}`}
          onClick={() => handleModeChange('gps')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
          </svg>
          현재 위치
        </button>
        <button
          className={`recommend-tab__mode ${locationMode === 'gu' ? 'recommend-tab__mode--active' : ''}`}
          onClick={() => handleModeChange('gu')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
          서울 구별
        </button>
        <button
          className={`recommend-tab__mode ${locationMode === 'subway' ? 'recommend-tab__mode--active' : ''}`}
          onClick={() => handleModeChange('subway')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="14" rx="3"/><line x1="4" y1="11" x2="20" y2="11"/><line x1="8" y1="17" x2="5" y2="21"/><line x1="16" y1="17" x2="19" y2="21"/><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/>
          </svg>
          지하철역
        </button>
      </div>

      {/* Preset location picker */}
      {locationMode !== 'gps' && (
        <div className="recommend-tab__presets">
          {(locationMode === 'gu' ? SEOUL_GU : SUBWAY_STATIONS).map((preset) => (
            <button
              key={preset.name}
              className={`recommend-tab__preset ${selectedPreset?.name === preset.name ? 'recommend-tab__preset--active' : ''}`}
              onClick={() => handlePresetSelect(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      )}

      {/* GPS error state */}
      {locationMode === 'gps' && !gpsLocation && !geoLoading && geoError && (
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
      )}

      {/* Location status + Budget (only when location is active) */}
      {(activeLocation || (locationMode === 'gps' && geoLoading)) && (
        <>
          <div className="recommend-tab__location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="none">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3" fill="var(--color-surface)"/>
            </svg>
            <span>{locationLabel}</span>
            {locationMode === 'gps' && activeLocation && (
              <button className="recommend-tab__refresh" onClick={requestLocation} title="위치 새로고침">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            )}
          </div>

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
        </>
      )}

      {/* Loading state */}
      {(isLoading || (locationMode === 'gps' && geoLoading)) && (
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

          {totalPages > 1 && (
            <div className="recommend-tab__pagination">
              <button disabled={page <= 1 || isLoading} onClick={() => handlePageChange(page - 1)}>
                &lsaquo; 이전
              </button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages || isLoading} onClick={() => handlePageChange(page + 1)}>
                다음 &rsaquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!isLoading && !geoLoading && results.length === 0 && !error && activeLocation && (
        <div className="recommend-tab__empty">
          <span>&#x1F37D;&#xFE0F;</span>
          <p>주변 1km 이내에 음식점이 없습니다</p>
        </div>
      )}

      {/* No location selected prompt */}
      {locationMode !== 'gps' && !selectedPreset && (
        <div className="recommend-tab__empty">
          <span>{locationMode === 'gu' ? '&#x1F3D8;&#xFE0F;' : '&#x1F687;'}</span>
          <p>{locationMode === 'gu' ? '구를 선택해주세요' : '지하철역을 선택해주세요'}</p>
        </div>
      )}
    </div>
  );
}
