import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Restaurant, MenuItem } from '../../types/restaurant';
import { NaverMap } from '../NaverMap/NaverMap';
import { StartingPoint } from '../StartingPoint/StartingPoint';
import { ErrorBoundary } from '../ErrorBoundary';
import { SharePanel } from '../SharePanel/SharePanel';
import { useDirections, formatDistance, formatDuration } from '../../hooks/useDirections';
import './ResultScreen.scss';

interface StartingPointData {
  lat: number;
  lng: number;
  name: string;
}

interface ResultScreenProps {
  winner: Restaurant;
  restaurants: Restaurant[];
  startingPoint: StartingPointData;
  onRetry: () => void;
  onStartOver: () => void;
  onUpdateStartingPoint: (point: StartingPointData) => void;
}

function formatPrice(price: number | null): string {
  if (price === null) return '-';
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
}

export function ResultScreen({
  winner,
  restaurants,
  startingPoint,
  onRetry,
  onStartOver,
  onUpdateStartingPoint,
}: ResultScreenProps) {
  const [showDirections, setShowDirections] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(winner.menuItems || []);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  const goal = useMemo(
    () => ({ lat: winner.lat, lng: winner.lng }),
    [winner.lat, winner.lng]
  );

  const start = useMemo(
    () => ({ lat: startingPoint.lat, lng: startingPoint.lng }),
    [startingPoint.lat, startingPoint.lng]
  );

  // Only fetch directions when the section is expanded
  const { directions, isLoading: directionsLoading, error: directionsError } = useDirections(
    showDirections ? start : null,
    showDirections ? goal : null
  );

  const mapCenter = useMemo(
    () => ({
      lat: (startingPoint.lat + winner.lat) / 2,
      lng: (startingPoint.lng + winner.lng) / 2,
    }),
    [startingPoint, winner]
  );

  const markers = useMemo(
    () => [
      { lat: startingPoint.lat, lng: startingPoint.lng, label: '출', color: '#3B82F6' },
      { lat: winner.lat, lng: winner.lng, label: '도', color: '#FF6B35' },
    ],
    [startingPoint, winner]
  );

  // Fetch menu data when winner is selected and has no menu items
  const fetchMenu = useCallback(async () => {
    if (!/^\d+$/.test(winner.id)) {
      setMenuError('메뉴 정보를 가져올 수 없습니다.');
      return;
    }
    setMenuLoading(true);
    setMenuError(null);
    try {
      const response = await fetch(`/api/place?id=${winner.id}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.menuItems && data.menuItems.length > 0) {
        setMenuItems(data.menuItems);
      } else {
        setMenuError('등록된 메뉴가 없습니다.');
      }
    } catch {
      setMenuError('메뉴 정보를 가져올 수 없습니다.');
    } finally {
      setMenuLoading(false);
    }
  }, [winner.id]);

  // Auto-fetch menu if winner has no menu items
  useEffect(() => {
    if (menuItems.length === 0 && /^\d+$/.test(winner.id)) {
      fetchMenu();
    }
  }, [winner.id, menuItems.length, fetchMenu]);

  return (
    <div className="result-screen">
      <div className="result-screen__celebration">
        <span className="result-screen__emoji">&#127881;</span>
        <h2 className="result-screen__title">여기로 가자!</h2>
      </div>

      <div className="result-screen__winner-card">
        {winner.thumbnail && (
          <div className="result-screen__image">
            <img src={winner.thumbnail} alt={winner.name} />
          </div>
        )}
        <div className="result-screen__info">
          <h3 className="result-screen__name">{winner.name}</h3>
          {winner.category && (
            <span className="result-screen__category">{winner.category}</span>
          )}
          {winner.roadAddress && (
            <p className="result-screen__address">{winner.roadAddress}</p>
          )}
          {winner.phone && (
            <p className="result-screen__phone">{winner.phone}</p>
          )}
        </div>
      </div>

      {/* Menu section */}
      <div className="result-screen__menu-section">
        <h4 className="result-screen__menu-title">메뉴</h4>
        {menuLoading && (
          <div className="result-screen__loading">메뉴를 불러오는 중...</div>
        )}
        {menuItems.length > 0 && (
          <ul className="result-screen__menu">
            {menuItems.map((item, i) => (
              <li key={i}>
                <span>{item.name}</span>
                <span>{formatPrice(item.price)}</span>
              </li>
            ))}
          </ul>
        )}
        {menuError && !menuLoading && (
          <div className="result-screen__menu-error">{menuError}</div>
        )}
        {menuItems.length === 0 && !menuLoading && !menuError && /^\d+$/.test(winner.id) && (
          <button className="result-screen__menu-fetch" onClick={fetchMenu}>
            메뉴 불러오기
          </button>
        )}
        {!/^\d+$/.test(winner.id) && menuItems.length === 0 && !menuLoading && (
          <a
            className="result-screen__menu-link"
            href={`https://map.naver.com/p/search/${encodeURIComponent(winner.name)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            네이버에서 메뉴 보기
          </a>
        )}
      </div>

      {/* Naver Map link — always visible */}
      <a
        className="result-screen__naver-link"
        href={`https://map.naver.com/p/directions/${startingPoint.lng},${startingPoint.lat},${encodeURIComponent(startingPoint.name)},,/${winner.lng},${winner.lat},${encodeURIComponent(winner.name)},,/-/walk?c=15.00,0,0,0,dh`}
        target="_blank"
        rel="noopener noreferrer"
      >
        네이버 지도에서 길찾기 (도보)
      </a>

      {/* Collapsible directions/map section */}
      <details className="result-screen__details" onToggle={(e) => setShowDirections((e.target as HTMLDetailsElement).open)}>
        <summary className="result-screen__details-summary">
          경로 및 지도 보기
        </summary>

        <div className="result-screen__details-content">
          {/* Directions summary */}
          {directions && (
            <div className="result-screen__directions-info">
              <div className="result-screen__directions-item">
                <span className="result-screen__directions-label">거리</span>
                <span className="result-screen__directions-value">
                  {formatDistance(directions.summary.distance)}
                </span>
              </div>
              <div className="result-screen__directions-item">
                <span className="result-screen__directions-label">예상 시간 (자동차)</span>
                <span className="result-screen__directions-value">
                  {formatDuration(directions.summary.duration)}
                </span>
              </div>
              {directions.summary.taxiFare > 0 && (
                <div className="result-screen__directions-item">
                  <span className="result-screen__directions-label">택시비</span>
                  <span className="result-screen__directions-value">
                    {new Intl.NumberFormat('ko-KR').format(directions.summary.taxiFare)}원
                  </span>
                </div>
              )}
            </div>
          )}

          {directionsLoading && (
            <div className="result-screen__loading">경로를 찾는 중...</div>
          )}

          {directionsError && !directionsLoading && (
            <div className="result-screen__directions-error">
              <p>경로 정보를 가져오지 못했어요</p>
              <p className="result-screen__directions-error-hint">
                네이버 지도에서 직접 검색해보세요
              </p>
            </div>
          )}

          {/* Starting point config */}
          <StartingPoint
            currentPoint={startingPoint}
            onUpdate={onUpdateStartingPoint}
          />

          {/* Map */}
          {winner.lat !== 0 && winner.lng !== 0 && (
            <ErrorBoundary
              fallback={
                <div className="naver-map">
                  <div className="naver-map__error">
                    <p>지도를 불러올 수 없습니다.</p>
                  </div>
                </div>
              }
            >
              <NaverMap
                center={mapCenter}
                markers={markers}
                path={directions?.path}
              />
            </ErrorBoundary>
          )}
        </div>
      </details>

      {/* Share */}
      <SharePanel winner={winner} restaurants={restaurants} />

      {/* Action buttons */}
      <div className="result-screen__actions">
        <button className="result-screen__btn result-screen__btn--retry" onClick={onRetry}>
          다시 하기
        </button>
        <button className="result-screen__btn result-screen__btn--restart" onClick={onStartOver}>
          새로 시작
        </button>
      </div>
    </div>
  );
}
