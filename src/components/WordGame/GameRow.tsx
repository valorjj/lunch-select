import React from 'react';
import { GameCell, CellStatus } from './GameCell';

interface GameRowProps {
  jamos: string[];
  statuses: CellStatus[];
  length: number;
}

export function GameRow({ jamos, statuses, length }: GameRowProps) {
  const cells = [];
  for (let i = 0; i < length; i++) {
    cells.push(
      <GameCell
        key={i}
        value={jamos[i] || ''}
        status={statuses[i] || (jamos[i] ? 'active' : 'empty')}
      />
    );
  }
  return <div className="word-game__row">{cells}</div>;
}
