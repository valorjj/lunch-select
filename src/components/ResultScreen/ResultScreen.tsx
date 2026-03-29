import React, { useState, useEffect, useCallback } from 'react';
import { Restaurant, MenuItem } from '../../types/restaurant';
import { SharePanel } from '../SharePanel/SharePanel';
// TODO: Re-enable when NCP API issues are resolved
// import { NaverMap } from '../NaverMap/NaverMap';
// import { StartingPoint } from '../StartingPoint/StartingPoint';
// import { ErrorBoundary } from '../ErrorBoundary';
// import { useDirections, formatDistance, formatDuration } from '../../hooks/useDirections';
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
  const [menuItems, setMenuItems] = useState<MenuItem[]>(winner.menuItems || []);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Fetch menu data when winner is selected and has no menu items
  const fetchMenu = useCallback(async () => {
    setMenuLoading(true);
    setMenuError(null);
    try {
      // Use naverPlaceId if resolved, otherwise source-based: Naver ID directly or cross-ref by name
      const isKakao = winner.source === 'kakao' && !winner.naverPlaceId;
      const apiUrl = isKakao
        ? `/api/place?name=${encodeURIComponent(winner.name)}&address=${encodeURIComponent(winner.roadAddress || winner.address || '')}`
        : `/api/place?id=${winner.naverPlaceId || winner.id}`;

      const response = await fetch(apiUrl);
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
  }, [winner.id, winner.naverPlaceId, winner.name, winner.roadAddress, winner.address, winner.source]);

  // Auto-fetch menu if winner has no menu items
  useEffect(() => {
    if (menuItems.length === 0) {
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
        {menuItems.length === 0 && !menuLoading && !menuError && (
          <button className="result-screen__menu-fetch" onClick={fetchMenu}>
            메뉴 불러오기
          </button>
        )}
        {menuItems.length === 0 && !menuLoading && (
          <a
            className="result-screen__menu-link"
            href={winner.naverMapUrl || `https://map.naver.com/p/search/${encodeURIComponent(winner.name)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            네이버 지도에서 보기
          </a>
        )}
      </div>

      {/* TODO: Naver Map link, directions, map, starting point — hidden until NCP API issues are resolved */}

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
