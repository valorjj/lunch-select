import React, { useEffect, useCallback } from 'react';
import { CellStatus } from './GameCell';

const ROW1 = ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'];
const ROW2 = ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'];
const ROW3 = ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'];

// Map physical keyboard keys to jamo (standard Korean keyboard layout)
const KEY_MAP: Record<string, string> = {
  'q': 'ㅂ', 'w': 'ㅈ', 'e': 'ㄷ', 'r': 'ㄱ', 't': 'ㅅ',
  'y': 'ㅛ', 'u': 'ㅕ', 'i': 'ㅑ', 'o': 'ㅐ', 'p': 'ㅔ',
  'a': 'ㅁ', 's': 'ㄴ', 'd': 'ㅇ', 'f': 'ㄹ', 'g': 'ㅎ',
  'h': 'ㅗ', 'j': 'ㅓ', 'k': 'ㅏ', 'l': 'ㅣ',
  'z': 'ㅋ', 'x': 'ㅌ', 'c': 'ㅊ', 'v': 'ㅍ',
  'b': 'ㅠ', 'n': 'ㅜ', 'm': 'ㅡ',
  'Q': 'ㅃ', 'W': 'ㅉ', 'E': 'ㄸ', 'R': 'ㄲ', 'T': 'ㅆ',
};

interface JamoKeyboardProps {
  onChar: (jamo: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  keyStatuses: Record<string, CellStatus>;
  disabled?: boolean;
}

export function JamoKeyboard({ onChar, onEnter, onDelete, keyStatuses, disabled }: JamoKeyboardProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter') {
      onEnter();
    } else if (e.key === 'Backspace') {
      onDelete();
    } else if (KEY_MAP[e.key]) {
      onChar(KEY_MAP[e.key]);
    }
  }, [onChar, onEnter, onDelete, disabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderKey = (jamo: string) => {
    const status = keyStatuses[jamo] || '';
    return (
      <button
        key={jamo}
        className={`word-game__key ${status ? `word-game__key--${status}` : ''}`}
        onClick={() => !disabled && onChar(jamo)}
        disabled={disabled}
      >
        {jamo}
      </button>
    );
  };

  return (
    <div className="word-game__keyboard">
      <div className="word-game__keyboard-row">
        {ROW1.map(renderKey)}
      </div>
      <div className="word-game__keyboard-row">
        {ROW2.map(renderKey)}
      </div>
      <div className="word-game__keyboard-row">
        <button
          className="word-game__key word-game__key--action"
          onClick={() => !disabled && onEnter()}
          disabled={disabled}
        >
          입력
        </button>
        {ROW3.map(renderKey)}
        <button
          className="word-game__key word-game__key--action"
          onClick={() => !disabled && onDelete()}
          disabled={disabled}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
