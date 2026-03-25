import { useState, useCallback } from 'react';
import { Restaurant } from '../types/restaurant';
import { extractPlaceId, isNaverMapUrl } from '../utils/parseNaverUrl';

interface UseRestaurantsReturn {
  restaurants: Restaurant[];
  isLoading: boolean;
  error: string | null;
  addFromUrl: (url: string) => Promise<void>;
  removeRestaurant: (id: string) => void;
  clearAll: () => void;
}

export function useRestaurants(): UseRestaurantsReturn {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFromUrl = useCallback(async (url: string) => {
    setError(null);

    if (!isNaverMapUrl(url)) {
      setError('네이버 지도 URL을 입력해주세요.');
      return;
    }

    const placeId = extractPlaceId(url);
    if (!placeId) {
      setError('URL에서 음식점 정보를 찾을 수 없습니다.');
      return;
    }

    // Check for duplicates
    if (restaurants.some((r) => r.id === placeId)) {
      setError('이미 추가된 음식점입니다.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/place?id=${placeId}`);
      if (!response.ok) {
        throw new Error('음식점 정보를 가져올 수 없습니다.');
      }

      const data = await response.json();
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

      setRestaurants((prev) => [...prev, restaurant]);
    } catch (err: any) {
      setError(err.message || '음식점 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurants]);

  const removeRestaurant = useCallback((id: string) => {
    setRestaurants((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setRestaurants([]);
    setError(null);
  }, []);

  return { restaurants, isLoading, error, addFromUrl, removeRestaurant, clearAll };
}
