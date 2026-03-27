import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Restaurant } from '../../types/restaurant';
import confetti from 'canvas-confetti';
import './GachaGame.scss';

interface GachaGameProps {
  restaurants: Restaurant[];
  onComplete: (winner: Restaurant) => void;
}

type GamePhase = 'idle' | 'lever' | 'shaking' | 'dropping' | 'bouncing' | 'opening' | 'reveal';

const CAPSULE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9',
];

export function GachaGame({ restaurants, onComplete }: GachaGameProps) {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const doneRef = useRef(false);

  // Assign each restaurant a capsule color and random position
  const capsules = useMemo(() => {
    return restaurants.map((r, i) => ({
      restaurant: r,
      color: CAPSULE_COLORS[i % CAPSULE_COLORS.length],
      // Random positions within the machine globe (percentage-based)
      x: 15 + Math.random() * 60,
      y: 15 + Math.random() * 50,
      delay: Math.random() * 2,
      size: 42 + Math.random() * 10,
    }));
  }, [restaurants]);

  const handleStart = useCallback(() => {
    if (phase !== 'idle') return;
    doneRef.current = false;

    // Pick random winner
    const idx = Math.floor(Math.random() * restaurants.length);
    setWinnerIdx(idx);

    // Phase sequence with timing
    setPhase('lever');
    setTimeout(() => setPhase('shaking'), 400);
    setTimeout(() => setPhase('dropping'), 2200);
    setTimeout(() => setPhase('bouncing'), 3400);
    setTimeout(() => setPhase('opening'), 4400);
    setTimeout(() => setPhase('reveal'), 5200);
  }, [phase, restaurants.length]);

  // Handle reveal
  useEffect(() => {
    if (phase === 'reveal' && winnerIdx !== null && !doneRef.current) {
      doneRef.current = true;

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 100,
          origin: { y: 0.5, x: 0.3 },
        });
      }, 300);

      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 100,
          origin: { y: 0.5, x: 0.7 },
        });
      }, 600);

      setTimeout(() => {
        onComplete(restaurants[winnerIdx]);
      }, 2500);
    }
  }, [phase, winnerIdx, restaurants, onComplete]);

  const winnerCapsule = winnerIdx !== null ? capsules[winnerIdx] : null;

  return (
    <div className="gacha-game">
      <div className={`gacha-game__machine ${phase !== 'idle' ? 'gacha-game__machine--active' : ''}`}>
        {/* Machine top / cap */}
        <div className="gacha-game__cap">
          <div className="gacha-game__cap-knob" />
        </div>

        {/* Glass globe */}
        <div className={`gacha-game__globe ${phase === 'shaking' ? 'gacha-game__globe--shaking' : ''}`}>
          <div className="gacha-game__globe-shine" />

          {/* Capsules inside */}
          {capsules.map((cap, i) => {
            const isWinner = i === winnerIdx;
            const isDropping = isWinner && (phase === 'dropping' || phase === 'bouncing' || phase === 'opening' || phase === 'reveal');
            const isHidden = isDropping;

            return (
              <div
                key={cap.restaurant.id}
                className={`gacha-game__capsule ${phase === 'shaking' ? 'gacha-game__capsule--tumble' : ''} ${isHidden ? 'gacha-game__capsule--hidden' : ''}`}
                style={{
                  left: `${cap.x}%`,
                  top: `${cap.y}%`,
                  width: cap.size,
                  height: cap.size,
                  animationDelay: `${cap.delay}s`,
                  '--capsule-color': cap.color,
                } as React.CSSProperties}
              >
                <div className="gacha-game__capsule-top" />
                <div className="gacha-game__capsule-bottom" />
                <span className="gacha-game__capsule-label">
                  {cap.restaurant.name.charAt(0)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Chute / dispenser */}
        <div className="gacha-game__base">
          <div className="gacha-game__chute">
            <div className="gacha-game__chute-door" />
          </div>

          {/* Lever */}
          <div
            className={`gacha-game__lever ${phase === 'lever' ? 'gacha-game__lever--pulled' : ''}`}
            onClick={handleStart}
            role="button"
            tabIndex={0}
          >
            <div className="gacha-game__lever-stick" />
            <div className="gacha-game__lever-handle" />
          </div>
        </div>

        {/* Dispensed capsule area */}
        <div className="gacha-game__output">
          {winnerCapsule && (phase === 'dropping' || phase === 'bouncing' || phase === 'opening' || phase === 'reveal') && (
            <div
              className={`gacha-game__dispensed gacha-game__dispensed--${phase}`}
              style={{ '--capsule-color': winnerCapsule.color } as React.CSSProperties}
            >
              {phase !== 'reveal' ? (
                <div className={`gacha-game__dispensed-capsule ${phase === 'opening' ? 'gacha-game__dispensed-capsule--cracking' : ''}`}>
                  <div className="gacha-game__dispensed-top" />
                  <div className="gacha-game__dispensed-bottom" />
                  <span className="gacha-game__dispensed-question">?</span>
                </div>
              ) : (
                <div className="gacha-game__reveal">
                  <div className="gacha-game__reveal-shell gacha-game__reveal-shell--left" style={{ '--capsule-color': winnerCapsule.color } as React.CSSProperties} />
                  <div className="gacha-game__reveal-shell gacha-game__reveal-shell--right" style={{ '--capsule-color': winnerCapsule.color } as React.CSSProperties} />
                  <div className="gacha-game__reveal-content">
                    <div className="gacha-game__reveal-star">&#10024;</div>
                    <div className="gacha-game__reveal-name">{winnerCapsule.restaurant.name}</div>
                    <div className="gacha-game__reveal-category">{winnerCapsule.restaurant.category}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Start button */}
      {phase === 'idle' && (
        <button className="gacha-game__start-btn" onClick={handleStart}>
          &#127922; &#xB7D1;&#xAE30;!
        </button>
      )}

      {/* Winner banner */}
      {phase === 'reveal' && winnerCapsule && (
        <div className="gacha-game__winner-banner fade-in">
          <span className="gacha-game__winner-icon">&#127881;</span>
          <strong>{winnerCapsule.restaurant.name}</strong> &#xB2F9;&#xCCA8;!
        </div>
      )}
    </div>
  );
}
