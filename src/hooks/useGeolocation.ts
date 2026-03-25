import { useState, useCallback } from 'react';

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

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<GeolocationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoading(false);
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
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  return { location, isLoading, error, requestLocation };
}
