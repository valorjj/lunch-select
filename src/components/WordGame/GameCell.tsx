import React from 'react';

export type CellStatus = 'correct' | 'present' | 'absent' | 'empty' | 'active';

interface GameCellProps {
  value: string;
  status: CellStatus;
}

export function GameCell({ value, status }: GameCellProps) {
  return (
    <div className={`word-game__cell word-game__cell--${status}`}>
      {value}
    </div>
  );
}
