import { useState, useCallback, useEffect } from 'react';

interface GeolocationResult {
  lat: number;
  lng: number;
}

interface UseGeolocationReturn {
  location: GeolocationResult | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => void;
}

const CACHE_KEY = 'lunch-select-geolocation';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedPosition(): GeolocationResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > CACHE_TTL) return null;
    return { lat: data.lat, lng: data.lng };
  } catch { return null; }
}

function cachePosition(lat: number, lng: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, timestamp: Date.now() }));
  } catch { /* ignore */ }
}

export function useGeolocation(autoRequest = false): UseGeolocationReturn {
  const [location, setLocation] = useState<GeolocationResult | null>(getCachedPosition);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    const cached = getCachedPosition();
    if (cached) {
      setLocation(cached);
      setError(null);
      return;
    }

    if (!navigator.geolocation) {
      setError('브라우저가 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setError(null);
        setIsLoading(false);
        cachePosition(latitude, longitude);
      },
      (err) => {
        let message = '위치를 가져올 수 없습니다.';
        if (err.code === err.PERMISSION_DENIED) {
          message = '위치 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.';
        } else if (err.code === err.TIMEOUT) {
          message = '위치 요청 시간이 초과되었습니다.';
        }
        setError(message);
        setIsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: CACHE_TTL },
    );
  }, []);

  useEffect(() => {
    if (autoRequest && !location) {
      requestLocation();
    }
  }, [autoRequest, location, requestLocation]);

  return { location, isLoading, error, requestLocation };
}
