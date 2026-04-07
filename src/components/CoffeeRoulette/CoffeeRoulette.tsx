import React, { useState, useCallback, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { apiFetch } from '../../utils/api';
import './CoffeeRoulette.scss';

interface CoffeeRouletteProps {
  participants?: string[];
  groupId?: number;
  onClose: () => void;
}

type Phase = 'setup' | 'spinning' | 'result';

const SEGMENT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F0B27A', '#AED6F1',
];

export function CoffeeRoulette({ participants: initialParticipants, groupId, onClose }: CoffeeRouletteProps) {
  const [phase, setPhase] = useState<Phase>(initialParticipants?.length ? 'setup' : 'setup');
  const [names, setNames] = useState<string[]>(initialParticipants || []);
  const [newName, setNewName] = useState('');
  const [buyer, setBuyer] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<SVGSVGElement>(null);
  const doneRef = useRef(false);

  const addName = useCallback(() => {
    const trimmed = newName.trim();
    if (trimmed && !names.includes(trimmed)) {
      setNames(prev => [...prev, trimmed]);
      setNewName('');
    }
  }, [newName, names]);

  const removeName = useCallback((name: string) => {
    setNames(prev => prev.filter(n => n !== name));
  }, []);

  const spin = useCallback(() => {
    if (names.length < 2) return;
    doneRef.current = false;

    const winnerIdx = Math.floor(Math.random() * names.length);
    const segmentAngle = 360 / names.length;
    // Calculate rotation so winner lands at top (pointer position)
    // We want the middle of the winner segment to align with the pointer (top = 270deg in SVG coords)
    const targetAngle = 360 - (winnerIdx * segmentAngle + segmentAngle / 2);
    const totalRotation = rotation + 1800 + targetAngle; // 5 full spins + offset

    setBuyer(names[winnerIdx]);
    setRotation(totalRotation);
    setPhase('spinning');

    setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        setPhase('result');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        // Save to backend
        apiFetch('/api/coffee-roulette', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: groupId || null,
            participantNames: names,
            buyerName: names[winnerIdx],
          }),
        }).catch(() => {});
      }
    }, 4500);
  }, [names, rotation, groupId]);

  const reset = useCallback(() => {
    setPhase('setup');
    setBuyer(null);
    doneRef.current = false;
  }, []);

  // Handle Enter key for name input
  useEffect(() => {
    if (phase === 'result') {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          reset();
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [phase, reset]);

  const segmentAngle = names.length > 0 ? 360 / names.length : 360;

  return (
    <div className="coffee-roulette">
      <div className="coffee-roulette__header">
        <h3 className="coffee-roulette__title">☕ 누가 쏘나?</h3>
        <button className="coffee-roulette__close" onClick={onClose}>&times;</button>
      </div>

      {phase === 'setup' && (
        <div className="coffee-roulette__setup">
          <div className="coffee-roulette__input-row">
            <input
              className="coffee-roulette__input"
              type="text"
              placeholder="이름 입력"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addName()}
              maxLength={20}
              autoFocus
            />
            <button className="coffee-roulette__add-btn" onClick={addName} disabled={!newName.trim()}>추가</button>
          </div>

          {names.length > 0 && (
            <div className="coffee-roulette__names">
              {names.map(name => (
                <span key={name} className="coffee-roulette__name-tag">
                  {name}
                  <button className="coffee-roulette__name-remove" onClick={() => removeName(name)}>&times;</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {names.length >= 2 && (
        <div className="coffee-roulette__wheel-container">
          <div className="coffee-roulette__pointer">&#9660;</div>
          <svg
            ref={wheelRef}
            className="coffee-roulette__wheel"
            viewBox="0 0 300 300"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: phase === 'spinning' ? 'transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            {names.map((name, i) => {
              const startAngle = i * segmentAngle;
              const endAngle = startAngle + segmentAngle;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              const x1 = 150 + 140 * Math.cos(startRad);
              const y1 = 150 + 140 * Math.sin(startRad);
              const x2 = 150 + 140 * Math.cos(endRad);
              const y2 = 150 + 140 * Math.sin(endRad);
              const largeArc = segmentAngle > 180 ? 1 : 0;

              const midAngle = ((startAngle + endAngle) / 2) * Math.PI / 180;
              const textX = 150 + 85 * Math.cos(midAngle);
              const textY = 150 + 85 * Math.sin(midAngle);
              const textRotation = (startAngle + endAngle) / 2;

              return (
                <g key={name}>
                  <path
                    d={`M150,150 L${x1},${y1} A140,140 0 ${largeArc},1 ${x2},${y2} Z`}
                    fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize={names.length > 6 ? '11' : '13'}
                    fontWeight="700"
                    transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                  >
                    {name.length > 5 ? name.slice(0, 5) + '..' : name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {phase === 'setup' && names.length >= 2 && (
        <button className="coffee-roulette__spin-btn" onClick={spin}>
          돌리기!
        </button>
      )}

      {phase === 'result' && buyer && (
        <div className="coffee-roulette__result">
          <div className="coffee-roulette__result-label">오늘의 커피 쏘는 사람</div>
          <div className="coffee-roulette__result-name">{buyer}</div>
          <button className="coffee-roulette__retry-btn" onClick={reset}>다시 돌리기</button>
        </div>
      )}
    </div>
  );
}
