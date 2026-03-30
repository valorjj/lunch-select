import React, { useState, useEffect, useCallback } from 'react';
import { SearchResult } from '../../types/restaurant';
import { useGeolocation } from '../../hooks/useGeolocation';
import { SUBWAY_LINES } from '../../data/subwayLines';
import { REGION_GROUPS } from '../../data/regions';
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

const CUISINE_ICONS: Record<string, string> = {
  '\uD55C\uC2DD': '\uD83C\uDDF0\uD83C\uDDF7',     // 한식 → 🇰🇷
  '\uC911\uC2DD': '\uD83E\uDD62',                   // 중식 → 🥢
  '\uC77C\uC2DD': '\uD83C\uDDEF\uD83C\uDDF5',     // 일식 → 🇯🇵
  '\uC591\uC2DD': '\uD83C\uDF55',                   // 양식 → 🍕 (placeholder — no western flag)
  '\uBD84\uC2DD': '\uD83C\uDF5C',                   // 분식 → 🍜
  '\uCE58\uD0A8': '\uD83C\uDF57',                   // 치킨 → 🍗
  '\uD328\uC2A4\uD2B8\uD478\uB4DC': '\uD83C\uDF54', // 패스트푸드 → 🍔
  '\uC81C\uACFC\uC810': '\uD83C\uDF70',             // 제과점 → 🍰
  '\uC0E4\uBE0C\uC0E4\uBE0C': '\uD83C\uDF72',     // 샤브샤브 → 🍲
  '\uC138\uACC4\uC694\uB9AC': '\uD83C\uDF0D',       // 세계요리 → 🌍
  '\uC804\uBB38\uC74C\uC2DD\uC810': '\uD83C\uDF7D\uFE0F', // 전문음식점 → 🍽️
  '\uB2E4\uC774\uC5B4\uD2B8/\uC0D0\uB7EC\uB4DC': '\uD83E\uDD57', // 다이어트/샐러드 → 🥗
  '\uB3C4\uC2DC\uB77D\uC804\uBB38': '\uD83C\uDF71', // 도시락전문 → 🍱
  '\uBD80\uD398': '\uD83E\uDD58',                   // 부페 → 🥘
  '\uD328\uBC00\uB9AC\uB808\uC2A4\uD1A0\uB791': '\uD83C\uDF7D\uFE0F', // 패밀리레스토랑 → 🍽️
};

function getCuisineIcon(cuisine: string): string {
  return CUISINE_ICONS[cuisine] || '\uD83C\uDF74'; // default: 🍴
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatBudget(won: number): string {
  return new Intl.NumberFormat('ko-KR').format(won) + '\uC6D0';
}

export function RecommendTab({ onSelect }: RecommendTabProps) {
  const { location: gpsLocation, isLoading: geoLoading, error: geoError, requestLocation } = useGeolocation(false);
  const [locationMode, setLocationMode] = useState<LocationMode>('gps');
  const [selectedPreset, setSelectedPreset] = useState<PresetLocation | null>(null);
  const [showSubwayModal, setShowSubwayModal] = useState(false);
  const [results, setResults] = useState<RecommendResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState(15000);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const [selectedRegion, setSelectedRegion] = useState(REGION_GROUPS[0].label);
  const activeLocation = locationMode === 'gps' ? gpsLocation : selectedPreset;

  // Extract cuisine type from Kakao category string (e.g., "음식점 > 한식 > 찌개" → "한식")
  const getCuisine = (cat: string) => {
    const parts = cat.split('>').map((s) => s.trim());
    return parts[1] || parts[0] || '';
  };

  // Unique cuisine types from current results
  const cuisineTypes = results.length > 0
    ? Array.from(new Set(results.map((r) => getCuisine(r.category)).filter(Boolean))).sort()
    : [];

  // Filtered results
  const filteredResults = categoryFilter
    ? results.filter((r) => getCuisine(r.category) === categoryFilter)
    : results;

  const fetchRecommendations = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recommend?lat=${lat}&lng=${lng}&radius=1000`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.results || []);
      setCategoryFilter(null);
    } catch {
      setError('\uC8FC\uBCC0 \uC74C\uC2DD\uC810\uC744 \uBD88\uB7EC\uC624\uB294 \uB370 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const [hasFetched, setHasFetched] = useState(false);

  // Request GPS only when GPS mode selected
  useEffect(() => {
    if (locationMode === 'gps' && !gpsLocation && !geoLoading) {
      requestLocation();
    }
  }, [locationMode, gpsLocation, geoLoading, requestLocation]);

  const handleSearch = () => {
    if (activeLocation) {
      setHasFetched(true);
      fetchRecommendations(activeLocation.lat, activeLocation.lng);
    }
  };

  const handleShuffle = () => {
    setResults((prev) => {
      const shuffled = [...prev].sort(() => Math.random() - 0.5);
      return shuffled;
    });
  };

  const handleModeChange = (mode: LocationMode) => {
    setLocationMode(mode);
    if (mode === 'subway') {
      setShowSubwayModal(true);
    } else {
      setSelectedPreset(null);
      setResults([]);
    }
  };

  const handlePresetSelect = (preset: PresetLocation) => {
    setSelectedPreset(preset);
  };

  const handleSubwaySelect = (station: { name: string; lat: number; lng: number }) => {
    setSelectedPreset({ name: `${station.name}\uC5ED`, lat: station.lat, lng: station.lng });
    setShowSubwayModal(false);
  };

  const handleSelect = (result: RecommendResult) => {
    onSelect(result);
    setAddedIds((prev) => new Set(prev).add(result.id));
  };

  const locationLabel = locationMode === 'gps'
    ? (geoLoading ? '\uC704\uCE58 \uD655\uC778 \uC911...' : '\uD604\uC7AC \uC704\uCE58 \uAE30\uBC18 \uCD94\uCC9C')
    : selectedPreset
    ? `${selectedPreset.name} \uC8FC\uBCC0 \uCD94\uCC9C`
    : '\uC9C0\uC5ED\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694';

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
          {'\uD604\uC7AC \uC704\uCE58'}
        </button>
        <button
          className={`recommend-tab__mode ${locationMode === 'gu' ? 'recommend-tab__mode--active' : ''}`}
          onClick={() => handleModeChange('gu')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
          {'\uC2DC/\uAD6C \uC120\uD0DD'}
        </button>
        <button
          className={`recommend-tab__mode ${locationMode === 'subway' ? 'recommend-tab__mode--active' : ''}`}
          onClick={() => { setLocationMode('subway'); setShowSubwayModal(true); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="14" rx="3"/><line x1="4" y1="11" x2="20" y2="11"/><line x1="8" y1="17" x2="5" y2="21"/><line x1="16" y1="17" x2="19" y2="21"/><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/>
          </svg>
          {'\uC9C0\uD558\uCCA0\uC5ED'}
        </button>
      </div>

      {/* Gu preset chips */}
      {locationMode === 'gu' && (
        <>
          <div className="recommend-tab__region-tabs">
            {REGION_GROUPS.map((rg) => (
              <button
                key={rg.label}
                className={`recommend-tab__region-tab ${selectedRegion === rg.label ? 'recommend-tab__region-tab--active' : ''}`}
                onClick={() => setSelectedRegion(rg.label)}
              >
                {rg.label}
              </button>
            ))}
          </div>
          <div className="recommend-tab__presets">
            {REGION_GROUPS.find((rg) => rg.label === selectedRegion)?.areas.map((preset) => (
              <button
                key={preset.name}
                className={`recommend-tab__preset ${selectedPreset?.name === preset.name ? 'recommend-tab__preset--active' : ''}`}
                onClick={() => handlePresetSelect(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Selected subway station chip */}
      {locationMode === 'subway' && selectedPreset && (
        <div className="recommend-tab__selected-station">
          <span>{selectedPreset.name}</span>
          <button onClick={() => setShowSubwayModal(true)}>{'\uBCC0\uACBD'}</button>
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
          <h3>{'\uC704\uCE58 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4'}</h3>
          <p>{geoError}</p>
          <button className="recommend-tab__permission-btn" onClick={requestLocation}>
            {'\uC704\uCE58 \uD5C8\uC6A9\uD558\uAE30'}
          </button>
        </div>
      )}

      {/* Location status + Budget */}
      {(activeLocation || (locationMode === 'gps' && geoLoading)) && (
        <>
          <div className="recommend-tab__location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="none">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3" fill="var(--color-surface)"/>
            </svg>
            <span>{locationLabel}</span>
            {locationMode === 'gps' && activeLocation && (
              <button className="recommend-tab__refresh" onClick={requestLocation} title={'\uC704\uCE58 \uC0C8\uB85C\uACE0\uCE68'}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            )}
          </div>

          <div className="recommend-tab__budget">
            <label className="recommend-tab__budget-label">
              {'\uC810\uC2EC \uC608\uC0B0: '}<strong>{formatBudget(budget)}</strong>{' \uC774\uD558'}
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
              <span>5,000{'\uC6D0'}</span>
              <span>50,000{'\uC6D0'}</span>
            </div>
          </div>

          <button
            className="recommend-tab__search-btn"
            onClick={handleSearch}
            disabled={isLoading || !activeLocation}
          >
            {isLoading ? '\uAC80\uC0C9 \uC911...' : '\uB9DB\uC9D1 \uAC80\uC0C9'}
          </button>
        </>
      )}

      {/* Loading state */}
      {(isLoading || (locationMode === 'gps' && geoLoading)) && (
        <div className="recommend-tab__loading">
          <div className="recommend-tab__spinner" />
          <span>{geoLoading ? '\uC704\uCE58\uB97C \uD655\uC778\uD558\uACE0 \uC788\uC5B4\uC694...' : '\uC8FC\uBCC0 \uB9DB\uC9D1\uC744 \uCC3E\uACE0 \uC788\uC5B4\uC694...'}</span>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="recommend-tab__error">{error}</div>
      )}

      {/* Category filter chips */}
      {!isLoading && !geoLoading && cuisineTypes.length > 1 && (
        <div className="recommend-tab__cuisines">
          <button
            className={`recommend-tab__cuisine ${!categoryFilter ? 'recommend-tab__cuisine--active' : ''}`}
            onClick={() => setCategoryFilter(null)}
          >
            {'\uC804\uCCB4'}
          </button>
          {cuisineTypes.map((c) => (
            <button
              key={c}
              className={`recommend-tab__cuisine ${categoryFilter === c ? 'recommend-tab__cuisine--active' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Results grid */}
      {!isLoading && !geoLoading && filteredResults.length > 0 && (
        <>
          <div className="recommend-tab__count">
            {'\uC8FC\uBCC0 \uC74C\uC2DD\uC810 '}<strong>{filteredResults.length}</strong>{'\uACF3'}
            {categoryFilter && <span className="recommend-tab__count-filter"> ({categoryFilter})</span>}
          </div>
          <div className="recommend-tab__grid">
            {filteredResults.map((r) => {
              const isAdded = addedIds.has(r.id);
              return (
                <div key={r.id} className="recommend-tab__card">
                  <div className="recommend-tab__card-top">
                    <span className="recommend-tab__card-icon">{getCuisineIcon(getCuisine(r.category))}</span>
                    <div className="recommend-tab__card-info">
                      <div className="recommend-tab__card-name">{r.name}</div>
                      <div className="recommend-tab__card-address">
                        {r.roadAddress || r.address}
                      </div>
                    </div>
                  </div>
                  <div className="recommend-tab__card-badges">
                    <span className="recommend-tab__badge recommend-tab__badge--cuisine">
                      {getCuisine(r.category)}
                    </span>
                    <span className="recommend-tab__badge recommend-tab__badge--distance">
                      {formatDistance(r.distance)}
                    </span>
                    {r.category.split('>').length > 2 && (
                      <span className="recommend-tab__badge recommend-tab__badge--detail">
                        {r.category.split('>').pop()?.trim().replace(/\\/g, '')}
                      </span>
                    )}
                    {r.phone && (
                      <span className="recommend-tab__badge recommend-tab__badge--phone">
                        {r.phone}
                      </span>
                    )}
                  </div>
                  <button
                    className={`recommend-tab__card-add ${isAdded ? 'recommend-tab__card-add--added' : ''}`}
                    onClick={() => handleSelect(r)}
                    disabled={isAdded}
                  >
                    {isAdded ? '\uCD94\uAC00\uB428' : '+ \uAC8C\uC784\uC5D0 \uCD94\uAC00'}
                  </button>
                </div>
              );
            })}
          </div>

          {filteredResults.length > 2 && (
            <button className="recommend-tab__shuffle" onClick={handleShuffle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                <line x1="4" y1="4" x2="9" y2="9"/>
              </svg>
              {'\uB2E4\uC2DC \uCD94\uCC9C'}
            </button>
          )}
        </>
      )}

      {/* Empty state — only after search */}
      {hasFetched && !isLoading && !geoLoading && results.length === 0 && !error && (
        <div className="recommend-tab__empty">
          <p>{'\uC8FC\uBCC0 1km \uC774\uB0B4\uC5D0 \uC74C\uC2DD\uC810\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'}</p>
        </div>
      )}

      {/* No location selected prompt */}
      {locationMode === 'gu' && !selectedPreset && (
        <div className="recommend-tab__empty">
          <p>{'\uAD6C\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694'}</p>
        </div>
      )}
      {locationMode === 'subway' && !selectedPreset && !showSubwayModal && (
        <div className="recommend-tab__empty">
          <button className="recommend-tab__permission-btn" onClick={() => setShowSubwayModal(true)}>
            {'\uC9C0\uD558\uCCA0\uC5ED \uC120\uD0DD\uD558\uAE30'}
          </button>
        </div>
      )}

      {/* Subway station modal */}
      {showSubwayModal && (
        <SubwayModal
          onSelect={handleSubwaySelect}
          onClose={() => setShowSubwayModal(false)}
        />
      )}
    </div>
  );
}

// ── Subway Station Modal ──
function SubwayModal({
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
          <h3>{'\uC9C0\uD558\uCCA0\uC5ED \uC120\uD0DD'}</h3>
          <button className="subway-modal__close" onClick={onClose}>&times;</button>
        </div>

        {/* Search */}
        <input
          className="subway-modal__search"
          type="text"
          placeholder={'\uC5ED\uBA85 \uAC80\uC0C9 (\uC608: \uAC15\uB0A8)'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {/* Line tabs */}
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

        {/* Station list */}
        <div className="subway-modal__stations">
          {search && <div className="subway-modal__search-label">{`"${search}" \uAC80\uC0C9 \uACB0\uACFC (${filteredStations.length}\uAC74)`}</div>}
          {filteredStations.length === 0 && (
            <div className="subway-modal__empty">{'\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4'}</div>
          )}
          <div className="subway-modal__station-grid">
            {filteredStations.map((s, i) => (
              <button
                key={`${s.line}-${s.name}-${i}`}
                className="subway-modal__station"
                onClick={() => onSelect(s)}
              >
                {search && (
                  <span className="subway-modal__station-dot" style={{ background: s.color }} />
                )}
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
