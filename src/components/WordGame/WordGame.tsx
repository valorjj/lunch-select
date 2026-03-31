import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { decomposeWord } from './hangul';
import { GameBoard } from './GameBoard';
import { JamoKeyboard } from './JamoKeyboard';
import { GameSettings } from './GameSettings';
import { CellStatus } from './GameCell';
import { FOOD_WORDS } from '../../data/foodWords';
import { GENERAL_WORDS } from '../../data/generalWords';
import { apiFetch } from '../../utils/api';
import './WordGame.scss';

const MAX_ATTEMPTS = 6;

interface GuessEntry {
  jamos: string[];
  statuses: CellStatus[];
}

function evaluateGuess(guess: string[], solution: string[]): CellStatus[] {
  const statuses: CellStatus[] = new Array(guess.length).fill('absent');
  const solutionUsed: boolean[] = new Array(solution.length).fill(false);

  // Pass 1: exact matches (green)
  guess.forEach((jamo, i) => {
    if (jamo === solution[i]) {
      statuses[i] = 'correct';
      solutionUsed[i] = true;
    }
  });

  // Pass 2: present but wrong position (yellow)
  guess.forEach((jamo, i) => {
    if (statuses[i] === 'correct') return;
    const idx = solution.findIndex((s, j) => s === jamo && !solutionUsed[j]);
    if (idx !== -1) {
      statuses[i] = 'present';
      solutionUsed[idx] = true;
    }
  });

  return statuses;
}

function pickRandomWord(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)];
}

// Use backend words if available, otherwise fall back to local
function getWordList(
  theme: 'food' | 'general',
  remoteWords: Record<string, Record<string, string[]>>,
  backendLoaded: boolean,
): Record<number, string[]> {
  const remote = remoteWords[theme];
  if (backendLoaded && remote) {
    // Backend available — use only backend words
    const result: Record<number, string[]> = {};
    for (const [key, words] of Object.entries(remote)) {
      result[Number(key)] = words;
    }
    return result;
  }
  // Backend not available — fall back to local
  return theme === 'food' ? FOOD_WORDS : GENERAL_WORDS;
}

export function WordGame() {
  const [syllableCount, setSyllableCount] = useState(2);
  const [theme, setTheme] = useState<'food' | 'general'>('food');
  const [remoteWords, setRemoteWords] = useState<Record<string, Record<string, string[]>>>({});
  const [backendLoaded, setBackendLoaded] = useState(false);
  const [solution, setSolution] = useState(() => {
    // Start with a local word so the game is playable immediately
    const words = FOOD_WORDS[2] || [];
    return words.length > 0 ? words[Math.floor(Math.random() * words.length)] : '김밥';
  });

  // Fetch words from backend on mount
  useEffect(() => {
    let loaded = 0;
    const fetchRemote = async (t: string) => {
      try {
        const res = await apiFetch(`/api/words?theme=${t}`);
        if (res.ok) {
          const data = await res.json();
          setRemoteWords((prev) => ({ ...prev, [t]: data }));
        }
      } catch { /* use local fallback */ }
      finally {
        loaded++;
        if (loaded >= 2) setBackendLoaded(true);
      }
    };
    fetchRemote('food');
    fetchRemote('general');
  }, []);
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [message, setMessage] = useState<string | null>(null);

  const solutionJamos = useMemo(() => decomposeWord(solution), [solution]);
  const jamoLength = solutionJamos.length;

  const keyStatuses = useMemo(() => {
    const statuses: Record<string, CellStatus> = {};
    for (const guess of guesses) {
      guess.jamos.forEach((jamo, i) => {
        const newStatus = guess.statuses[i];
        const existing = statuses[jamo];
        // Priority: correct > present > absent
        if (!existing || newStatus === 'correct' || (newStatus === 'present' && existing === 'absent')) {
          statuses[jamo] = newStatus;
        }
      });
    }
    return statuses;
  }, [guesses]);

  const currentWordList = useMemo(
    () => getWordList(theme, remoteWords, backendLoaded),
    [theme, remoteWords, backendLoaded]
  );

  const availableCounts = useMemo(
    () => [2, 3, 4, 5].filter((n) => (currentWordList[n] || []).length > 0),
    [currentWordList]
  );

  // Auto-start game once backend words are loaded
  useEffect(() => {
    if (backendLoaded) {
      const wordList = getWordList(theme, remoteWords, true);
      const counts = [2, 3, 4, 5].filter((n) => (wordList[n] || []).length > 0);
      const count = counts.includes(syllableCount) ? syllableCount : counts[0] || 2;
      if (count !== syllableCount) setSyllableCount(count);
      const words = wordList[count] || [];
      if (words.length > 0) {
        setSolution(pickRandomWord(words));
      }
      // Always ensure game is in playing state after backend load
      setGuesses([]);
      setCurrentGuess([]);
      setGameStatus('playing');
      setMessage(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendLoaded]);

  const startNewGame = useCallback((sc?: number, th?: 'food' | 'general') => {
    const count = sc ?? syllableCount;
    const wordTheme = th ?? theme;
    const wordList = getWordList(wordTheme, remoteWords, backendLoaded);
    const words = wordList[count] || [];
    if (words.length === 0) {
      setMessage('해당 설정의 단어가 없습니다. Admin에서 등록해주세요.');
      return;
    }
    setSolution(pickRandomWord(words));
    setGuesses([]);
    setCurrentGuess([]);
    setGameStatus('playing');
    setMessage(null);
  }, [syllableCount, theme, remoteWords, backendLoaded]);

  const handleSyllableCountChange = useCallback((count: number) => {
    setSyllableCount(count);
    startNewGame(count, undefined);
  }, [startNewGame]);

  const handleThemeChange = useCallback((th: 'food' | 'general') => {
    setTheme(th);
    startNewGame(undefined, th);
  }, [startNewGame]);

  const handleChar = useCallback((jamo: string) => {
    if (gameStatus !== 'playing') return;
    if (currentGuess.length >= jamoLength) return;
    setCurrentGuess((prev) => [...prev, jamo]);
    setMessage(null);
  }, [gameStatus, currentGuess.length, jamoLength]);

  const handleDelete = useCallback(() => {
    if (gameStatus !== 'playing') return;
    setCurrentGuess((prev) => prev.slice(0, -1));
    setMessage(null);
  }, [gameStatus]);

  const handleEnter = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (currentGuess.length !== jamoLength) {
      setMessage(`자모 ${jamoLength}개를 모두 입력해주세요.`);
      return;
    }

    const statuses = evaluateGuess(currentGuess, solutionJamos);
    const newGuess: GuessEntry = { jamos: [...currentGuess], statuses };
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);
    setCurrentGuess([]);

    if (statuses.every((s) => s === 'correct')) {
      setGameStatus('won');
      setMessage(`정답! "${solution}" 맞았습니다!`);
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameStatus('lost');
      setMessage(`아쉽네요! 정답은 "${solution}" 이었습니다.`);
    }
  }, [gameStatus, currentGuess, jamoLength, solutionJamos, guesses, solution]);

  return (
    <div className="word-game">
      <GameSettings
        syllableCount={syllableCount}
        onSyllableCountChange={handleSyllableCountChange}
        theme={theme}
        onThemeChange={handleThemeChange}
        onNewGame={() => startNewGame()}
        availableCounts={availableCounts}
      />

      <div className="word-game__hint">
        {theme === 'food' ? '음식' : '일반'} 단어 | {syllableCount}글자 | 자모 {jamoLength}개
      </div>

      <GameBoard
        guesses={guesses}
        currentGuess={currentGuess}
        jamoLength={jamoLength}
        maxAttempts={MAX_ATTEMPTS}
      />

      {message && (
        <div className={`word-game__message ${gameStatus === 'won' ? 'word-game__message--won' : gameStatus === 'lost' ? 'word-game__message--lost' : ''}`}>
          {message}
        </div>
      )}

      <JamoKeyboard
        onChar={handleChar}
        onEnter={handleEnter}
        onDelete={handleDelete}
        keyStatuses={keyStatuses}
        disabled={gameStatus !== 'playing'}
      />
    </div>
  );
}
