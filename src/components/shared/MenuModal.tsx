import React, { useState, useEffect, useCallback } from 'react';
import { formatPrice } from '../../utils/format';
import './MenuModal.scss';

interface MenuRestaurant {
  name: string;
  roadAddress?: string;
  address?: string;
}

interface MenuModalProps {
  restaurant: MenuRestaurant | null;
  onClose: () => void;
}

interface MenuData {
  name: string;
  items: { name: string; price: number | null }[];
  rating: number | null;
  reviewCount: number | null;
  loading: boolean;
  error: string | null;
}

export function MenuModal({ restaurant, onClose }: MenuModalProps) {
  const [data, setData] = useState<MenuData | null>(null);

  const fetchMenu = useCallback(async (r: MenuRestaurant) => {
    setData({ name: r.name, items: [], rating: null, reviewCount: null, loading: true, error: null });
    try {
      const apiUrl = `/api/place?name=${encodeURIComponent(r.name)}&address=${encodeURIComponent(r.roadAddress || r.address || '')}`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData({
        name: json.name || r.name,
        items: json.menuItems || [],
        rating: json.rating ?? null,
        reviewCount: json.reviewCount ?? null,
        loading: false,
        error: json.menuItems?.length > 0 ? null : '등록된 메뉴가 없습니다.',
      });
    } catch {
      setData({ name: r.name, items: [], rating: null, reviewCount: null, loading: false, error: '메뉴 정보를 가져올 수 없습니다.' });
    }
  }, []);

  useEffect(() => {
    if (restaurant) {
      fetchMenu(restaurant);
    } else {
      setData(null);
    }
  }, [restaurant, fetchMenu]);

  if (!restaurant || !data) return null;

  return (
    <div className="menu-modal__overlay" onClick={onClose}>
      <div className="menu-modal" onClick={(e) => e.stopPropagation()}>
        <div className="menu-modal__header">
          <div>
            <h3>{data.name}</h3>
            {data.rating !== null && data.rating > 0 && (
              <div className="menu-modal__rating">
                <span className="menu-modal__star">{'\u2605'}</span>
                <span className="menu-modal__score">{data.rating.toFixed(2)}</span>
                {data.reviewCount !== null && (
                  <span className="menu-modal__reviews">
                    (리뷰 {data.reviewCount.toLocaleString()})
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose}>&times;</button>
        </div>
        {data.loading && (
          <div className="menu-modal__loading">
            <div className="menu-modal__spinner" />
            <span>메뉴를 불러오는 중...</span>
          </div>
        )}
        {data.error && !data.loading && (
          <div className="menu-modal__error">{data.error}</div>
        )}
        {data.items.length > 0 && (
          <ul className="menu-modal__menu">
            {data.items.map((item, i) => (
              <li key={i}>
                <span>{item.name}</span>
                <span>{formatPrice(item.price)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
