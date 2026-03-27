import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';
import { GlobalLoader } from '../GlobalLoader/GlobalLoader';
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
  isSuperAdmin?: boolean;
}

type AdminTab = 'words' | 'stats' | 'admins';

interface SearchStats {
  period: string;
  totalSearches: number;
  topKeywords: Array<{ keyword: string; count: number }>;
  topRegions: Array<{ region: string; count: number }>;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  provider: string;
}

export function AdminPanel({ onClose, isSuperAdmin }: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>('words');
  const [words, setWords] = useState<GameWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [statsDays, setStatsDays] = useState(7);
  const [statsLoading, setStatsLoading] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [filterTheme, setFilterTheme] = useState<string>('all');
  const [filterSyllable, setFilterSyllable] = useState<number | null>(null);
  const [newWord, setNewWord] = useState('');
  const [newTheme, setNewTheme] = useState('food');
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

  const fetchStats = useCallback(async (days: number) => {
    setStatsLoading(true);
    try {
      const res = await apiFetch(`/api/search-logs/stats?days=${days}`);
      if (res.ok) setStats(await res.json());
    } catch {} finally { setStatsLoading(false); }
  }, []);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/admins');
      if (res.ok) setAdmins(await res.json());
    } catch {}
  }, []);

  const handleAddAdmin = async () => {
    const email = newAdminEmail.trim();
    if (!email) return;
    setBusy(true); setBusyMessage('관리자 추가 중...');
    try {
      const res = await apiFetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewAdminEmail('');
        setMessage(`${data.name || email} 관리자 추가됨`);
        await fetchAdmins();
      } else {
        setMessage(data.error || '추가 실패');
      }
      setTimeout(() => setMessage(null), 3000);
    } finally { setBusy(false); }
  };

  const handleRemoveAdmin = async (admin: AdminUser) => {
    if (!window.confirm(`"${admin.email}" 관리자 권한을 제거하시겠습니까?`)) return;
    setBusy(true); setBusyMessage('권한 제거 중...');
    try {
      await apiFetch(`/api/admin/admins/${admin.id}`, { method: 'DELETE' });
      await fetchAdmins();
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (tab === 'admins') fetchAdmins();
  }, [tab, fetchAdmins]);

  useEffect(() => {
    if (tab === 'stats') fetchStats(statsDays);
  }, [tab, statsDays, fetchStats]);

  const handleAdd = async () => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    if (words.some(w => w.word === trimmed)) {
      setMessage(`"${trimmed}" 이미 등록된 단어입니다`);
      setTimeout(() => setMessage(null), 2000);
      return;
    }
    setBusy(true); setBusyMessage('단어 추가 중...');
    try {
      const res = await apiFetch('/api/admin/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: trimmed, syllableCount: trimmed.length, theme: newTheme }),
      });
      if (res.ok) {
        setNewWord('');
        setMessage(`"${trimmed}" 추가됨`);
        await fetchWords();
        setTimeout(() => setMessage(null), 2000);
      }
    } finally { setBusy(false); }
  };

  const handleBulkAdd = async () => {
    const existingWords = new Set(words.map(w => w.word));
    const wordList = bulkText.split(/[,\n]/).map(w => w.trim()).filter(Boolean);
    const unique = Array.from(new Set(wordList)).filter(w => !existingWords.has(w));
    const skipped = wordList.length - unique.length;
    if (unique.length === 0) {
      setMessage(`모두 중복된 단어입니다 (${skipped}개 건너뜀)`);
      setTimeout(() => setMessage(null), 2000);
      return;
    }
    setBusy(true); setBusyMessage(`${unique.length}개 단어 추가 중...`);
    try {
      const batch = unique.map(w => ({ word: w, syllableCount: w.length, theme: newTheme }));
      const res = await apiFetch('/api/admin/words/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      if (res.ok) {
        const data = await res.json();
        setBulkText('');
        setShowBulk(false);
        setMessage(`${data.count}개 단어 추가됨${skipped > 0 ? ` (${skipped}개 중복 건너뜀)` : ''}`);
        await fetchWords();
        setTimeout(() => setMessage(null), 2000);
      }
    } finally { setBusy(false); }
  };

  const handleToggle = async (word: GameWord) => {
    setBusy(true); setBusyMessage('변경 중...');
    try {
      await apiFetch(`/api/admin/words/${word.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !word.active }),
      });
      await fetchWords();
    } finally { setBusy(false); }
  };

  const handleDelete = async (word: GameWord) => {
    if (!window.confirm(`"${word.word}" 삭제하시겠습니까?`)) return;
    setBusy(true); setBusyMessage('삭제 중...');
    try {
      await apiFetch(`/api/admin/words/${word.id}`, { method: 'DELETE' });
      await fetchWords();
    } finally { setBusy(false); }
  };

  const handleDeleteAll = async () => {
    if (filtered.length === 0) return;
    const label = filterTheme === 'all' ? '전체' : filterTheme === 'food' ? '음식' : '일반';
    const syllableLabel = filterSyllable ? ` ${filterSyllable}글자` : '';
    if (!window.confirm(`⚠️ ${label}${syllableLabel} 단어 ${filtered.length}개를 모두 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;
    if (!window.confirm(`정말 삭제하시겠습니까? (${filtered.length}개)`)) return;
    setBusy(true); setBusyMessage(`${filtered.length}개 삭제 중...`);
    try {
      for (const w of filtered) {
        await apiFetch(`/api/admin/words/${w.id}`, { method: 'DELETE' });
      }
      setMessage(`${filtered.length}개 단어 삭제됨`);
      await fetchWords();
      setTimeout(() => setMessage(null), 2000);
    } finally { setBusy(false); }
  };

  const filtered = words.filter(w => {
    if (filterTheme !== 'all' && w.theme !== filterTheme) return false;
    if (filterSyllable !== null && w.syllableCount !== filterSyllable) return false;
    return true;
  });

  const activeCount = filtered.filter(w => w.active).length;

  return (
    <div className="admin-panel">
      <GlobalLoader visible={busy} message={busyMessage} />
      <div className="admin-panel__header">
        <h2>Admin</h2>
        <div className="admin-panel__tabs">
          <button className={`admin-panel__tab ${tab === 'words' ? 'admin-panel__tab--active' : ''}`} onClick={() => setTab('words')}>단어 관리</button>
          <button className={`admin-panel__tab ${tab === 'stats' ? 'admin-panel__tab--active' : ''}`} onClick={() => setTab('stats')}>검색 통계</button>
          {isSuperAdmin && (
            <button className={`admin-panel__tab ${tab === 'admins' ? 'admin-panel__tab--active' : ''}`} onClick={() => setTab('admins')}>관리자</button>
          )}
        </div>
        <button className="admin-panel__close" onClick={onClose}>&times;</button>
      </div>

      {message && <div className="admin-panel__message">{message}</div>}

      {tab === 'stats' && (
        <div className="admin-panel__stats">
          <div className="admin-panel__stats-header">
            <div className="admin-panel__filter-group">
              {[1, 7, 30].map(d => (
                <button
                  key={d}
                  className={`admin-panel__filter ${statsDays === d ? 'admin-panel__filter--active' : ''}`}
                  onClick={() => setStatsDays(d)}
                >
                  {d === 1 ? '오늘' : `${d}일`}
                </button>
              ))}
            </div>
            {stats && <span className="admin-panel__count">총 {stats.totalSearches}회 검색</span>}
          </div>

          {statsLoading ? (
            <div className="admin-panel__loading">통계 로딩 중...</div>
          ) : stats ? (
            <div className="admin-panel__stats-grid">
              <div className="admin-panel__stats-section">
                <h3>인기 검색어</h3>
                {stats.topKeywords.length === 0 ? (
                  <div className="admin-panel__empty">검색 기록이 없습니다</div>
                ) : (
                  <div className="admin-panel__stats-list">
                    {stats.topKeywords.map((item, i) => (
                      <div key={item.keyword} className="admin-panel__stats-row">
                        <span className="admin-panel__stats-rank">{i + 1}</span>
                        <span className="admin-panel__stats-keyword">{item.keyword}</span>
                        <span className="admin-panel__stats-count">{item.count}회</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="admin-panel__stats-section">
                <h3>인기 지역</h3>
                {stats.topRegions.length === 0 ? (
                  <div className="admin-panel__empty">지역 데이터가 없습니다</div>
                ) : (
                  <div className="admin-panel__stats-list">
                    {stats.topRegions.map((item, i) => (
                      <div key={item.region} className="admin-panel__stats-row">
                        <span className="admin-panel__stats-rank">{i + 1}</span>
                        <span className="admin-panel__stats-keyword">{item.region}</span>
                        <span className="admin-panel__stats-count">{item.count}회</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'admins' && isSuperAdmin && (
        <div className="admin-panel__admins">
          <div className="admin-panel__add-row">
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="관리자로 추가할 이메일 (로그인된 사용자만 가능)"
              className="admin-panel__input"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAdmin(); } }}
            />
            <button className="admin-panel__btn admin-panel__btn--primary" onClick={handleAddAdmin}>추가</button>
          </div>
          <div className="admin-panel__list" style={{ marginTop: '0.75rem' }}>
            {admins.map(a => (
              <div key={a.id} className="admin-panel__word">
                <span className="admin-panel__word-text">{a.name}</span>
                <span className="admin-panel__word-meta">{a.email} · {a.provider}</span>
                <div className="admin-panel__word-actions">
                  {a.id !== 0 && (
                    <button
                      className="admin-panel__btn admin-panel__btn--small admin-panel__btn--danger"
                      onClick={() => handleRemoveAdmin(a)}
                    >
                      제거
                    </button>
                  )}
                  {a.id === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Super Admin</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'words' && <>
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
          {newWord.trim() && (
            <span className="admin-panel__auto-count">{newWord.trim().length}글자</span>
          )}
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
        {filtered.length > 0 && (
          <button className="admin-panel__btn admin-panel__btn--small admin-panel__btn--danger" onClick={handleDeleteAll}>
            전체 삭제
          </button>
        )}
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
      </>}
    </div>
  );
}
