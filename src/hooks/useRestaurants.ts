import { useState, useCallback } from 'react';
import { Restaurant, SearchResult } from '../types/restaurant';
import { extractPlaceId, isNaverMapUrl } from '../utils/parseNaverUrl';
import { apiFetch } from '../utils/api';

function loadSaved(storageKey: string): Restaurant[] {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveToStorage(storageKey: string, restaurants: Restaurant[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(restaurants));
  } catch { /* ignore quota errors */ }
}

interface UseRestaurantsReturn {
  restaurants: Restaurant[];
  isLoading: boolean;
  error: string | null;
  addFromUrl: (url: string) => Promise<void>;
  addFromSearch: (result: SearchResult) => void;
  removeRestaurant: (id: string) => void;
  clearAll: () => void;
}

export function useRestaurants(storageKey: string = 'lunch-select-restaurants'): UseRestaurantsReturn {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => loadSaved(storageKey));
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

      const response = await apiFetch(apiUrl);
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
        saveToStorage(storageKey, next);
        return next;
      });
    } catch (err: any) {
      setError(err.message || '음식점 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurants, storageKey]);

  const addFromSearch = useCallback((result: SearchResult) => {
    setError(null);

    if (restaurants.some((r) => r.id === result.id)) {
      setError('이미 추가된 음식점입니다.');
      return;
    }

    // Add restaurant immediately with basic info (no menu)
    const restaurant: Restaurant = {
      id: result.id,
      name: result.name,
      category: result.category,
      menuItems: [],
      thumbnail: '',
      address: result.address,
      roadAddress: result.roadAddress,
      lat: result.lat,
      lng: result.lng,
      phone: result.phone,
      naverMapUrl: result.naverMapUrl,
      source: result.source,
    };

    setRestaurants((prev) => {
      const next = [...prev, restaurant];
      saveToStorage(storageKey, next);
      return next;
    });

    // Fetch menu/thumbnail in background
    const menuApiUrl = /^\d+$/.test(result.id)
      ? `/api/place?id=${result.id}`
      : `/api/place?name=${encodeURIComponent(result.name)}&address=${encodeURIComponent(result.roadAddress || result.address || '')}`;

    apiFetch(menuApiUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setRestaurants((prev) => {
          const next = prev.map((r) =>
            r.id === result.id
              ? {
                  ...r,
                  menuItems: data.menuItems || [],
                  thumbnail: data.thumbnail || r.thumbnail,
                  naverPlaceId: data.id || undefined,
                }
              : r
          );
          saveToStorage(storageKey, next);
          return next;
        });
      })
      .catch(() => {
        // Silent failure — restaurant stays with empty menu
      });
  }, [restaurants, storageKey]);

  const removeRestaurant = useCallback((id: string) => {
    setRestaurants((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveToStorage(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const clearAll = useCallback(() => {
    setRestaurants([]);
    saveToStorage(storageKey, []);
    setError(null);
  }, [storageKey]);

  return { restaurants, isLoading, error, addFromUrl, addFromSearch, removeRestaurant, clearAll };
}
