import React, { useMemo } from 'react';
import { Restaurant } from '../../types/restaurant';
import { NaverMap } from '../NaverMap/NaverMap';
import { StartingPoint } from '../StartingPoint/StartingPoint';
import { useDirections, formatDistance, formatDuration } from '../../hooks/useDirections';
import './ResultScreen.scss';

interface StartingPointData {
  lat: number;
  lng: number;
  name: string;
}

interface ResultScreenProps {
  winner: Restaurant;
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
  startingPoint,
  onRetry,
  onStartOver,
  onUpdateStartingPoint,
}: ResultScreenProps) {
  const { directions, isLoading: directionsLoading } = useDirections(
    startingPoint,
    { lat: winner.lat, lng: winner.lng }
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
          {winner.menuItems.length > 0 && (
            <ul className="result-screen__menu">
              {winner.menuItems.slice(0, 5).map((item, i) => (
                <li key={i}>
                  <span>{item.name}</span>
                  <span>{formatPrice(item.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

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
            <span className="result-screen__directions-label">예상 시간</span>
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

      {/* Starting point config */}
      <StartingPoint
        currentPoint={startingPoint}
        onUpdate={onUpdateStartingPoint}
      />

      {/* Map */}
      {winner.lat !== 0 && winner.lng !== 0 && (
        <NaverMap
          center={mapCenter}
          markers={markers}
          path={directions?.path}
        />
      )}

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
