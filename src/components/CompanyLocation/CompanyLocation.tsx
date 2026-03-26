import React, { useState, useCallback } from 'react';
import { SavedLocation } from '../../hooks/useCompanyLocation';
import './CompanyLocation.scss';

interface CompanyLocationProps {
  location: SavedLocation;
  savedLocations: SavedLocation[];
  onUpdate: (loc: SavedLocation) => void;
  onSave: (loc: SavedLocation) => void;
  onRemoveSaved: (name: string) => void;
}

export function CompanyLocation({ location, savedLocations, onUpdate, onSave, onRemoveSaved }: CompanyLocationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [address, setAddress] = useState('');
  const [saveName, setSaveName] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);

  const handleGpsClick = useCallback(async () => {
    setGpsLoading(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        name: '현재 위치',
      });
    } catch {
      setError('위치를 가져올 수 없습니다.');
    } finally {
      setGpsLoading(false);
    }
  }, [onUpdate]);

  const handleAddressSearch = useCallback(async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    setError(null);
    try {
      // Use Vercel function directly (not apiFetch which routes to Spring Boot)
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(address.trim())}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      onUpdate({
        lat: data.lat,
        lng: data.lng,
        name: address.trim(),
      });
      setAddress('');
    } catch {
      setError('주소를 찾을 수 없습니다.');
    } finally {
      setGeocoding(false);
    }
  }, [address, onUpdate]);

  const handleSave = useCallback(() => {
    const name = saveName.trim();
    if (!name) return;
    onSave({ ...location, name });
    setSaveName('');
    setShowSaveForm(false);
  }, [saveName, location, onSave]);

  return (
    <div className="company-location">
      <button
        className="company-location__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="company-location__label">
          출발지: <strong>{location.name}</strong>
        </span>
        <span className="company-location__action">
          {isExpanded ? '닫기' : '변경'}
        </span>
      </button>

      {isExpanded && (
        <div className="company-location__panel fade-in">
          {savedLocations.length > 0 && (
            <div className="company-location__saved">
              <div className="company-location__saved-label">저장된 위치</div>
              <div className="company-location__chips">
                {savedLocations.map((loc) => (
                  <div key={loc.name} className="company-location__chip">
                    <button
                      className={`company-location__chip-btn ${loc.name === location.name ? 'company-location__chip-btn--active' : ''}`}
                      onClick={() => onUpdate(loc)}
                    >
                      {loc.name}
                    </button>
                    <button
                      className="company-location__chip-remove"
                      onClick={() => onRemoveSaved(loc.name)}
                      title="삭제"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            className="company-location__option"
            onClick={handleGpsClick}
            disabled={gpsLoading}
          >
            {gpsLoading ? '위치 찾는 중...' : '현재 위치 사용'}
          </button>

          <div className="company-location__manual">
            <input
              type="text"
              className="company-location__input"
              placeholder="주소 또는 장소명을 입력하세요 (예: 역삼역)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
            />
            <button
              className="company-location__search-btn"
              onClick={handleAddressSearch}
              disabled={!address.trim() || geocoding}
            >
              {geocoding ? '...' : '검색'}
            </button>
          </div>

          {error && (
            <div className="company-location__error">{error}</div>
          )}

          {location.lat !== 0 && (
            <div className="company-location__info">
              {location.name} ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
            </div>
          )}

          {!showSaveForm ? (
            <button
              className="company-location__save-toggle"
              onClick={() => { setSaveName(location.name); setShowSaveForm(true); }}
            >
              현재 위치를 즐겨찾기에 저장
            </button>
          ) : (
            <div className="company-location__save-form">
              <input
                type="text"
                className="company-location__input"
                placeholder="저장할 이름 (예: 본사)"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button
                className="company-location__search-btn"
                onClick={handleSave}
                disabled={!saveName.trim()}
              >
                저장
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
