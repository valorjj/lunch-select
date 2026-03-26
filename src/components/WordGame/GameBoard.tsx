import React from 'react';
import { GameRow } from './GameRow';
import { CellStatus } from './GameCell';

interface GuessEntry {
  jamos: string[];
  statuses: CellStatus[];
}

interface GameBoardProps {
  guesses: GuessEntry[];
  currentGuess: string[];
  jamoLength: number;
  maxAttempts: number;
}

export function GameBoard({ guesses, currentGuess, jamoLength, maxAttempts }: GameBoardProps) {
  const rows = [];

  // Completed guesses
  for (let i = 0; i < guesses.length; i++) {
    rows.push(
      <GameRow
        key={`guess-${i}`}
        jamos={guesses[i].jamos}
        statuses={guesses[i].statuses}
        length={jamoLength}
      />
    );
  }

  // Current guess row
  if (guesses.length < maxAttempts) {
    rows.push(
      <GameRow
        key="current"
        jamos={currentGuess}
        statuses={[]}
        length={jamoLength}
      />
    );
  }

  // Empty rows
  for (let i = guesses.length + 1; i < maxAttempts; i++) {
    rows.push(
      <GameRow
        key={`empty-${i}`}
        jamos={[]}
        statuses={[]}
        length={jamoLength}
      />
    );
  }

  return <div className="word-game__board">{rows}</div>;
}
