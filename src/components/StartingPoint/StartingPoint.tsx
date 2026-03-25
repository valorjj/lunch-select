import React, { useState, useCallback } from 'react';
import { DEFAULT_OFFICE } from '../../config/defaults';
import { useGeolocation } from '../../hooks/useGeolocation';
import './StartingPoint.scss';

interface StartingPointData {
  lat: number;
  lng: number;
  name: string;
}

interface StartingPointProps {
  currentPoint: StartingPointData;
  onUpdate: (point: StartingPointData) => void;
}

type Mode = 'default' | 'gps' | 'manual';

export function StartingPoint({ currentPoint, onUpdate }: StartingPointProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>('default');
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const { location, isLoading: gpsLoading, error: gpsError, requestLocation } = useGeolocation();

  const handleDefault = useCallback(() => {
    setMode('default');
    onUpdate({
      lat: DEFAULT_OFFICE.lat,
      lng: DEFAULT_OFFICE.lng,
      name: DEFAULT_OFFICE.name,
    });
  }, [onUpdate]);

  const handleGps = useCallback(() => {
    setMode('gps');
    requestLocation();
  }, [requestLocation]);

  // Update when GPS location arrives
  React.useEffect(() => {
    if (mode === 'gps' && location) {
      onUpdate({
        lat: location.lat,
        lng: location.lng,
        name: '현재 위치',
      });
    }
  }, [mode, location, onUpdate]);

  const handleManualSubmit = useCallback(async () => {
    if (!address.trim()) return;

    setGeocoding(true);
    try {
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(address.trim())}`);
      if (!response.ok) throw new Error('주소를 찾을 수 없습니다.');

      const data = await response.json();
      setMode('manual');
      onUpdate({
        lat: data.lat,
        lng: data.lng,
        name: address.trim(),
      });
    } catch {
      // silently fail for now
    } finally {
      setGeocoding(false);
    }
  }, [address, onUpdate]);

  return (
    <div className="starting-point">
      <button
        className="starting-point__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="starting-point__current">
          출발지: <strong>{currentPoint.name}</strong>
        </span>
        <span className="starting-point__arrow">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div className="starting-point__panel fade-in">
          <button
            className={`starting-point__option ${mode === 'default' ? 'starting-point__option--active' : ''}`}
            onClick={handleDefault}
          >
            기본 위치 사용
            <span className="starting-point__option-desc">{DEFAULT_OFFICE.address}</span>
          </button>

          <button
            className={`starting-point__option ${mode === 'gps' ? 'starting-point__option--active' : ''}`}
            onClick={handleGps}
            disabled={gpsLoading}
          >
            {gpsLoading ? '위치 찾는 중...' : '현재 위치 사용'}
            {gpsError && <span className="starting-point__error">{gpsError}</span>}
          </button>

          <div className="starting-point__manual">
            <input
              type="text"
              className="starting-point__input"
              placeholder="주소를 입력하세요"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            />
            <button
              className="starting-point__search-btn"
              onClick={handleManualSubmit}
              disabled={!address.trim() || geocoding}
            >
              {geocoding ? '...' : '검색'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
