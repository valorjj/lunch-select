import { useState, useCallback } from 'react';
import { Restaurant } from '../types/restaurant';
import { extractPlaceId, isNaverMapUrl } from '../utils/parseNaverUrl';

const STORAGE_KEY = 'lunch-select-restaurants';

function loadSaved(): Restaurant[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveToStorage(restaurants: Restaurant[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(restaurants));
  } catch { /* ignore quota errors */ }
}

interface UseRestaurantsReturn {
  restaurants: Restaurant[];
  isLoading: boolean;
  error: string | null;
  addFromUrl: (url: string) => Promise<void>;
  removeRestaurant: (id: string) => void;
  clearAll: () => void;
}

export function useRestaurants(): UseRestaurantsReturn {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(loadSaved);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFromUrl = useCallback(async (url: string) => {
    setError(null);

    if (!isNaverMapUrl(url)) {
      setError('네이버 지도 URL을 입력해주세요.');
      return;
    }

    // Try to extract place ID client-side first (for duplicate check)
    const clientPlaceId = extractPlaceId(url);
    if (clientPlaceId && restaurants.some((r) => r.id === clientPlaceId)) {
      setError('이미 추가된 음식점입니다.');
      return;
    }

    setIsLoading(true);
    try {
      // Build the API URL: use place ID if available, otherwise send raw URL for server-side resolution
      const apiUrl = clientPlaceId
        ? `/api/place?id=${clientPlaceId}`
        : `/api/place?url=${encodeURIComponent(url)}`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || '음식점 정보를 가져올 수 없습니다.');
      }

      const data = await response.json();
      const placeId = data.id || clientPlaceId || url;

      // Check for duplicates again with the resolved ID
      if (restaurants.some((r) => r.id === placeId)) {
        setError('이미 추가된 음식점입니다.');
        return;
      }

      const restaurant: Restaurant = {
        id: placeId,
        name: data.name,
        category: data.category,
        menuItems: data.menuItems || [],
        thumbnail: data.thumbnail,
        address: data.address,
        roadAddress: data.roadAddress,
        lat: data.lat,
        lng: data.lng,
        phone: data.phone,
        naverMapUrl: url,
      };

      setRestaurants((prev) => {
        const next = [...prev, restaurant];
        saveToStorage(next);
        return next;
      });
    } catch (err: any) {
      setError(err.message || '음식점 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurants]);

  const removeRestaurant = useCallback((id: string) => {
    setRestaurants((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRestaurants([]);
    saveToStorage([]);
    setError(null);
  }, []);

  return { restaurants, isLoading, error, addFromUrl, removeRestaurant, clearAll };
}
