import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';
import './AdminPanel.scss';

interface GameWord {
  id: number;
  word: string;
  syllableCount: number;
  theme: string;
  active: boolean;
  createdAt: string;
}

interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [words, setWords] = useState<GameWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTheme, setFilterTheme] = useState<string>('all');
  const [filterSyllable, setFilterSyllable] = useState<number | null>(null);
  const [newWord, setNewWord] = useState('');
  const [newTheme, setNewTheme] = useState('food');
  const [newSyllable, setNewSyllable] = useState(2);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/words');
      if (res.ok) {
        setWords(await res.json());
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  const handleAdd = async () => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    const res = await apiFetch('/api/admin/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: trimmed, syllableCount: newSyllable, theme: newTheme }),
    });
    if (res.ok) {
      setNewWord('');
      setMessage(`"${trimmed}" 추가됨`);
      fetchWords();
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleBulkAdd = async () => {
    const wordList = bulkText.split(/[,\n]/).map(w => w.trim()).filter(Boolean);
    if (wordList.length === 0) return;
    const batch = wordList.map(w => ({ word: w, syllableCount: w.length, theme: newTheme }));
    const res = await apiFetch('/api/admin/words/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.ok) {
      const data = await res.json();
      setBulkText('');
      setShowBulk(false);
      setMessage(`${data.count}개 단어 추가됨`);
      fetchWords();
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleToggle = async (word: GameWord) => {
    await apiFetch(`/api/admin/words/${word.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !word.active }),
    });
    fetchWords();
  };

  const handleDelete = async (word: GameWord) => {
    if (!window.confirm(`"${word.word}" 삭제하시겠습니까?`)) return;
    await apiFetch(`/api/admin/words/${word.id}`, { method: 'DELETE' });
    fetchWords();
  };

  const filtered = words.filter(w => {
    if (filterTheme !== 'all' && w.theme !== filterTheme) return false;
    if (filterSyllable !== null && w.syllableCount !== filterSyllable) return false;
    return true;
  });

  const activeCount = filtered.filter(w => w.active).length;

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h2>단어 관리 (Admin)</h2>
        <button className="admin-panel__close" onClick={onClose}>&times;</button>
      </div>

      {message && <div className="admin-panel__message">{message}</div>}

      {/* Add word */}
      <div className="admin-panel__add">
        <div className="admin-panel__add-row">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="새 단어 입력"
            className="admin-panel__input"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          />
          <select value={newTheme} onChange={(e) => setNewTheme(e.target.value)} className="admin-panel__select">
            <option value="food">음식</option>
            <option value="general">일반</option>
          </select>
          <select value={newSyllable} onChange={(e) => setNewSyllable(Number(e.target.value))} className="admin-panel__select">
            {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n}글자</option>)}
          </select>
          <button className="admin-panel__btn admin-panel__btn--primary" onClick={handleAdd}>추가</button>
        </div>
        <button className="admin-panel__btn admin-panel__btn--text" onClick={() => setShowBulk(!showBulk)}>
          {showBulk ? '접기' : '일괄 추가'}
        </button>
        {showBulk && (
          <div className="admin-panel__bulk">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="쉼표 또는 줄바꿈으로 구분 (글자수 자동 감지)&#10;예: 비빔밥, 떡볶이, 삼겹살"
              className="admin-panel__textarea"
              rows={4}
            />
            <button className="admin-panel__btn admin-panel__btn--primary" onClick={handleBulkAdd}>
              일괄 추가 ({bulkText.split(/[,\n]/).filter(w => w.trim()).length}개)
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="admin-panel__filters">
        <div className="admin-panel__filter-group">
          {['all', 'food', 'general'].map(t => (
            <button
              key={t}
              className={`admin-panel__filter ${filterTheme === t ? 'admin-panel__filter--active' : ''}`}
              onClick={() => setFilterTheme(t)}
            >
              {t === 'all' ? '전체' : t === 'food' ? '음식' : '일반'}
            </button>
          ))}
        </div>
        <div className="admin-panel__filter-group">
          <button
            className={`admin-panel__filter ${filterSyllable === null ? 'admin-panel__filter--active' : ''}`}
            onClick={() => setFilterSyllable(null)}
          >전체</button>
          {[2, 3, 4, 5].map(n => (
            <button
              key={n}
              className={`admin-panel__filter ${filterSyllable === n ? 'admin-panel__filter--active' : ''}`}
              onClick={() => setFilterSyllable(n)}
            >{n}글자</button>
          ))}
        </div>
        <span className="admin-panel__count">
          {activeCount}개 활성 / {filtered.length}개 전체
        </span>
      </div>

      {/* Word list */}
      <div className="admin-panel__list">
        {loading ? (
          <div className="admin-panel__loading">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-panel__empty">등록된 단어가 없습니다</div>
        ) : (
          filtered.map(w => (
            <div key={w.id} className={`admin-panel__word ${!w.active ? 'admin-panel__word--inactive' : ''}`}>
              <span className="admin-panel__word-text">{w.word}</span>
              <span className="admin-panel__word-meta">
                {w.theme === 'food' ? '음식' : '일반'} · {w.syllableCount}글자
              </span>
              <div className="admin-panel__word-actions">
                <button
                  className={`admin-panel__btn admin-panel__btn--small ${w.active ? 'admin-panel__btn--warn' : 'admin-panel__btn--success'}`}
                  onClick={() => handleToggle(w)}
                >
                  {w.active ? '비활성' : '활성화'}
                </button>
                <button
                  className="admin-panel__btn admin-panel__btn--small admin-panel__btn--danger"
                  onClick={() => handleDelete(w)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
