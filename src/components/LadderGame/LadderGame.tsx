import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Restaurant } from '../../types/restaurant';
import { generateLadder, tracePath, getRungsForRendering } from './ladderLogic';
import { useAnimation } from './useAnimation';
import { APP_CONFIG } from '../../config/defaults';
import confetti from 'canvas-confetti';
import './LadderGame.scss';

interface LadderGameProps {
  restaurants: Restaurant[];
  onComplete: (winner: Restaurant) => void;
}

const PADDING_X = 60;
const PADDING_TOP = 60;
const PADDING_BOTTOM = 80;
const COL_MIN_GAP = 100;
const ROW_HEIGHT = 40;

export function LadderGame({ restaurants, onComplete }: LadderGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'done'>('ready');
  const [startCol, setStartCol] = useState<number | null>(null);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const doneRef = useRef(false);

  const columns = restaurants.length;
  const rowCount = columns * APP_CONFIG.ladderRowMultiplier;

  const ladder = useMemo(
    () => generateLadder(columns, rowCount),
    [columns, rowCount]
  );

  const svgWidth = Math.max(PADDING_X * 2 + (columns - 1) * COL_MIN_GAP, 400);
  const svgHeight = PADDING_TOP + rowCount * ROW_HEIGHT + PADDING_BOTTOM;

  const colX = useCallback(
    (col: number) => PADDING_X + col * ((svgWidth - PADDING_X * 2) / Math.max(columns - 1, 1)),
    [svgWidth, columns]
  );

  const rowY = useCallback(
    (row: number) => {
      if (row < 0) return PADDING_TOP - 10;
      if (row >= rowCount) return PADDING_TOP + rowCount * ROW_HEIGHT + 10;
      return PADDING_TOP + row * ROW_HEIGHT;
    },
    [rowCount]
  );

  const path = useMemo(() => {
    if (startCol === null) return [];
    return tracePath(ladder, startCol);
  }, [ladder, startCol]);

  const pathPixels = useMemo(() => {
    return path.map((p) => ({ x: colX(p.col), y: rowY(p.row) }));
  }, [path, colX, rowY]);

  const { ballRef, glowRef, trailRef, progress, isAnimating, start: startAnimation } = useAnimation(
    pathPixels,
    APP_CONFIG.animationDurationMs
  );

  const handleStart = useCallback(() => {
    const randomStart = Math.floor(Math.random() * columns);
    setStartCol(randomStart);
    setGameState('playing');
    doneRef.current = false;
  }, [columns]);

  // Start animation when startCol is set
  useEffect(() => {
    if (gameState === 'playing' && path.length > 0 && !isAnimating && !doneRef.current) {
      startAnimation();
    }
  }, [gameState, path, isAnimating, startAnimation]);

  // Handle animation completion
  useEffect(() => {
    if (gameState === 'playing' && progress >= 1 && !doneRef.current) {
      doneRef.current = true;
      const resultCol = path[path.length - 1].col;
      setWinnerIndex(resultCol);
      setGameState('done');

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        onComplete(restaurants[resultCol]);
      }, 2000);
    }
  }, [gameState, progress, path, restaurants, onComplete]);

  const rungs = getRungsForRendering(ladder);

  // Final trail for done state (all path points)
  const finalTrailPoints = useMemo(() => {
    if (gameState !== 'done' || pathPixels.length < 2) return '';
    return pathPixels.map((p) => `${p.x},${p.y}`).join(' ');
  }, [gameState, pathPixels]);

  return (
    <div className="ladder-game">
      <div className="ladder-game__container">
        <svg
          className="ladder-game__svg"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Vertical lines */}
          {Array.from({ length: columns }).map((_, col) => (
            <line
              key={`col-${col}`}
              x1={colX(col)}
              y1={PADDING_TOP}
              x2={colX(col)}
              y2={PADDING_TOP + rowCount * ROW_HEIGHT}
              stroke="#D1D5DB"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}

          {/* Horizontal rungs */}
          {rungs.map((rung, i) => (
            <line
              key={`rung-${i}`}
              x1={colX(rung.leftCol)}
              y1={rowY(rung.row)}
              x2={colX(rung.leftCol + 1)}
              y2={rowY(rung.row)}
              stroke="#D1D5DB"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}

          {/* Trail line — ref-based during animation, static when done */}
          {gameState === 'playing' && (
            <polyline
              ref={trailRef}
              points=""
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
          )}
          {gameState === 'done' && finalTrailPoints && (
            <polyline
              points={finalTrailPoints}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
          )}

          {/* Animated ball — ref-based, no React re-renders */}
          {(gameState === 'playing') && (
            <>
              <circle
                ref={glowRef}
                cx={0}
                cy={0}
                r={10}
                fill="var(--color-primary)"
                opacity={0.2}
              >
                <animate
                  attributeName="r"
                  values="10;16;10"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                ref={ballRef}
                cx={0}
                cy={0}
                r={8}
                fill="var(--color-primary)"
              />
            </>
          )}

          {/* Start indicators (top) */}
          {Array.from({ length: columns }).map((_, col) => (
            <g key={`start-${col}`}>
              <circle
                cx={colX(col)}
                cy={PADDING_TOP - 20}
                r={12}
                fill={startCol === col ? 'var(--color-primary)' : '#E5E7EB'}
                stroke={startCol === col ? 'var(--color-primary)' : '#D1D5DB'}
                strokeWidth={1}
              />
              <text
                x={colX(col)}
                y={PADDING_TOP - 16}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill={startCol === col ? '#fff' : '#9CA3AF'}
              >
                {col + 1}
              </text>
            </g>
          ))}

          {/* Restaurant names (bottom) */}
          {restaurants.map((r, col) => (
            <g key={`label-${col}`}>
              <rect
                x={colX(col) - 45}
                y={PADDING_TOP + rowCount * ROW_HEIGHT + 15}
                width={90}
                height={32}
                rx={8}
                fill={winnerIndex === col ? 'var(--color-primary)' : '#F3F4F6'}
                stroke={winnerIndex === col ? 'var(--color-primary)' : '#E5E7EB'}
                strokeWidth={1}
                className={winnerIndex === col ? 'ladder-game__winner-label' : ''}
              />
              <text
                x={colX(col)}
                y={PADDING_TOP + rowCount * ROW_HEIGHT + 35}
                textAnchor="middle"
                fontSize="11"
                fontWeight={winnerIndex === col ? '700' : '500'}
                fill={winnerIndex === col ? '#fff' : '#374151'}
              >
                {r.name.length > 6 ? r.name.slice(0, 6) + '...' : r.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {gameState === 'ready' && (
        <button className="ladder-game__start-btn" onClick={handleStart}>
          시작!
        </button>
      )}

      {gameState === 'done' && winnerIndex !== null && (
        <div className="ladder-game__winner-banner fade-in">
          <span className="ladder-game__winner-icon">&#127881;</span>
          <strong>{restaurants[winnerIndex].name}</strong> 당첨!
        </div>
      )}
    </div>
  );
}
