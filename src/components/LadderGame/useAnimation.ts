import { useState, useRef, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface UseAnimationReturn {
  currentPos: Point | null;
  progress: number;
  isAnimating: boolean;
  start: () => void;
  reset: () => void;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getPointAlongPath(points: Point[], progress: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  // Calculate total path length
  const segments: number[] = [];
  let totalLength = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segments.push(len);
    totalLength += len;
  }

  const targetLength = progress * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segments.length; i++) {
    if (accumulated + segments[i] >= targetLength) {
      const segProgress = (targetLength - accumulated) / segments[i];
      return {
        x: lerp(points[i].x, points[i + 1].x, segProgress),
        y: lerp(points[i].y, points[i + 1].y, segProgress),
      };
    }
    accumulated += segments[i];
  }

  return points[points.length - 1];
}

export function useAnimation(
  pathPoints: Point[],
  durationMs: number
): UseAnimationReturn {
  const [currentPos, setCurrentPos] = useState<Point | null>(null);
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const animate = useCallback(
    (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const rawProgress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeOutCubic(rawProgress);

      const pos = getPointAlongPath(pathPoints, easedProgress);
      setCurrentPos(pos);
      setProgress(easedProgress);

      if (rawProgress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    },
    [pathPoints, durationMs]
  );

  const start = useCallback(() => {
    if (pathPoints.length < 2) return;
    startTimeRef.current = 0;
    setIsAnimating(true);
    setProgress(0);
    setCurrentPos(pathPoints[0]);
    rafRef.current = requestAnimationFrame(animate);
  }, [pathPoints, animate]);

  const reset = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    setCurrentPos(null);
    setProgress(0);
    setIsAnimating(false);
    startTimeRef.current = 0;
  }, []);

  return { currentPos, progress, isAnimating, start, reset };
}
