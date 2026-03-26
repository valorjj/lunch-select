import { useState, useEffect } from 'react';

interface DirectionsResult {
  path: [number, number][];
  summary: {
    distance: number;
    duration: number;
    tollFare: number;
    taxiFare: number;
    fuelPrice: number;
  };
}

interface UseDirectionsReturn {
  directions: DirectionsResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useDirections(
  start: { lat: number; lng: number } | null,
  goal: { lat: number; lng: number } | null
): UseDirectionsReturn {
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!start || !goal) {
      setDirections(null);
      return;
    }

    let cancelled = false;

    async function fetchDirections() {
      setIsLoading(true);
      setError(null);

      try {
        const startParam = `${start!.lng},${start!.lat}`;
        const goalParam = `${goal!.lng},${goal!.lat}`;
        // Use direct fetch (not apiFetch) since directions endpoint is a Vercel function
        const response = await fetch(
          `/api/directions?start=${encodeURIComponent(startParam)}&goal=${encodeURIComponent(goalParam)}`
        );

        if (!response.ok) {
          throw new Error('경로를 찾을 수 없습니다.');
        }

        const data = await response.json();
        if (!cancelled) {
          setDirections(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || '경로 조회 중 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchDirections();

    return () => {
      cancelled = true;
    };
  }, [start, goal]);

  return { directions, isLoading, error };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainMinutes = minutes % 60;
    return `${hours}시간 ${remainMinutes}분`;
  }
  return `${minutes}분`;
}
