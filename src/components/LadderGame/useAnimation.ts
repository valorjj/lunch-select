import { useState, useRef, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface UseAnimationReturn {
  ballRef: React.RefObject<SVGCircleElement | null>;
  glowRef: React.RefObject<SVGCircleElement | null>;
  trailRef: React.RefObject<SVGPolylineElement | null>;
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

export function useAnimation(
  pathPoints: Point[],
  durationMs: number
): UseAnimationReturn {
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Direct DOM refs for smooth animation without React re-renders
  const ballRef = useRef<SVGCircleElement | null>(null);
  const glowRef = useRef<SVGCircleElement | null>(null);
  const trailRef = useRef<SVGPolylineElement | null>(null);

  // Pre-compute segment lengths once
  const segmentsRef = useRef<{ lengths: number[]; totalLength: number }>({
    lengths: [],
    totalLength: 0,
  });

  const computeSegments = useCallback((points: Point[]) => {
    const lengths: number[] = [];
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      lengths.push(len);
      totalLength += len;
    }
    segmentsRef.current = { lengths, totalLength };
  }, []);

  const animate = useCallback(
    (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const rawProgress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeOutCubic(rawProgress);

      const { lengths, totalLength } = segmentsRef.current;
      const targetLength = easedProgress * totalLength;

      // Find ball position and build trail in the same loop
      let accumulated = 0;
      let ballX = pathPoints[0]?.x ?? 0;
      let ballY = pathPoints[0]?.y ?? 0;
      const trailParts: string[] = [`${pathPoints[0]?.x ?? 0},${pathPoints[0]?.y ?? 0}`];

      for (let i = 0; i < lengths.length; i++) {
        if (accumulated + lengths[i] >= targetLength) {
          // Ball is within this segment
          const segProgress = lengths[i] > 0 ? (targetLength - accumulated) / lengths[i] : 0;
          ballX = lerp(pathPoints[i].x, pathPoints[i + 1].x, segProgress);
          ballY = lerp(pathPoints[i].y, pathPoints[i + 1].y, segProgress);
          trailParts.push(`${ballX},${ballY}`);
          break;
        }
        accumulated += lengths[i];
        trailParts.push(`${pathPoints[i + 1].x},${pathPoints[i + 1].y}`);
      }

      // If we've gone past all segments (progress >= 1)
      if (easedProgress >= 1) {
        const last = pathPoints[pathPoints.length - 1];
        ballX = last.x;
        ballY = last.y;
        // Trail should include all points
        // (already built in loop above, but ensure last point)
      }

      // Direct DOM updates — no React re-render needed
      if (ballRef.current) {
        ballRef.current.setAttribute('cx', String(ballX));
        ballRef.current.setAttribute('cy', String(ballY));
      }
      if (glowRef.current) {
        glowRef.current.setAttribute('cx', String(ballX));
        glowRef.current.setAttribute('cy', String(ballY));
      }
      if (trailRef.current) {
        trailRef.current.setAttribute('points', trailParts.join(' '));
      }

      if (rawProgress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setProgress(1);
      }
    },
    [pathPoints, durationMs]
  );

  const start = useCallback(() => {
    if (pathPoints.length < 2) return;
    computeSegments(pathPoints);
    startTimeRef.current = 0;
    setIsAnimating(true);
    setProgress(0);
    rafRef.current = requestAnimationFrame(animate);
  }, [pathPoints, animate, computeSegments]);

  const reset = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    setProgress(0);
    setIsAnimating(false);
    startTimeRef.current = 0;
  }, []);

  return { ballRef, glowRef, trailRef, progress, isAnimating, start, reset };
}
