import React, { useState, useEffect, useCallback } from 'react';
import { CellStatus } from './GameCell';

const ROW1 = ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'];
const ROW2 = ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'];
const ROW3 = ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'];

const ROW1_SHIFT = ['ㅃ', 'ㅉ', 'ㄸ', 'ㄲ', 'ㅆ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅒ', 'ㅖ'];
const ROW2_SHIFT = ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅘ', 'ㅝ', 'ㅏ', 'ㅣ'];
const ROW3_SHIFT = ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅟ', 'ㅢ'];

// Map physical keyboard keys to jamo (standard Korean keyboard layout)
const KEY_MAP: Record<string, string> = {
  'q': 'ㅂ', 'w': 'ㅈ', 'e': 'ㄷ', 'r': 'ㄱ', 't': 'ㅅ',
  'y': 'ㅛ', 'u': 'ㅕ', 'i': 'ㅑ', 'o': 'ㅐ', 'p': 'ㅔ',
  'a': 'ㅁ', 's': 'ㄴ', 'd': 'ㅇ', 'f': 'ㄹ', 'g': 'ㅎ',
  'h': 'ㅗ', 'j': 'ㅓ', 'k': 'ㅏ', 'l': 'ㅣ',
  'z': 'ㅋ', 'x': 'ㅌ', 'c': 'ㅊ', 'v': 'ㅍ',
  'b': 'ㅠ', 'n': 'ㅜ', 'm': 'ㅡ',
  'Q': 'ㅃ', 'W': 'ㅉ', 'E': 'ㄸ', 'R': 'ㄲ', 'T': 'ㅆ',
  'O': 'ㅒ', 'P': 'ㅖ',
};

interface JamoKeyboardProps {
  onChar: (jamo: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  keyStatuses: Record<string, CellStatus>;
  disabled?: boolean;
}

export function JamoKeyboard({ onChar, onEnter, onDelete, keyStatuses, disabled }: JamoKeyboardProps) {
  const [shifted, setShifted] = useState(false);

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

  const row1 = shifted ? ROW1_SHIFT : ROW1;
  const row2 = shifted ? ROW2_SHIFT : ROW2;
  const row3 = shifted ? ROW3_SHIFT : ROW3;

  const handleKeyClick = (jamo: string) => {
    if (disabled) return;
    onChar(jamo);
    setShifted(false);
  };

  const renderKey = (jamo: string) => {
    const status = keyStatuses[jamo] || '';
    const isDouble = 'ㅃㅉㄸㄲㅆ'.includes(jamo);
    const isCompound = 'ㅘㅙㅚㅝㅞㅟㅢㅒㅖ'.includes(jamo);
    return (
      <button
        key={jamo}
        className={`word-game__key ${status ? `word-game__key--${status}` : ''} ${isDouble ? 'word-game__key--double' : ''} ${isCompound ? 'word-game__key--compound' : ''}`}
        onClick={() => handleKeyClick(jamo)}
        disabled={disabled}
      >
        {jamo}
      </button>
    );
  };

  return (
    <div className="word-game__keyboard">
      <div className="word-game__keyboard-row">
        {row1.map(renderKey)}
      </div>
      <div className="word-game__keyboard-row">
        {row2.map(renderKey)}
      </div>
      <div className="word-game__keyboard-row">
        <button
          className="word-game__key word-game__key--action"
          onClick={() => !disabled && onEnter()}
          disabled={disabled}
        >
          입력
        </button>
        {row3.map(renderKey)}
        <button
          className="word-game__key word-game__key--action"
          onClick={() => !disabled && onDelete()}
          disabled={disabled}
        >
          삭제
        </button>
      </div>
      <div className="word-game__keyboard-row word-game__keyboard-row--shift">
        <button
          className={`word-game__key word-game__key--shift ${shifted ? 'word-game__key--shift-active' : ''}`}
          onClick={() => setShifted(!shifted)}
        >
          {shifted ? '기본' : '쌍/복합'}
        </button>
      </div>
    </div>
  );
}
