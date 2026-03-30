import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import './VisitorCounter.scss';

function getTodayKey(): string {
  return `visitor_tracked_${new Date().toISOString().slice(0, 10)}`;
}

export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    const todayKey = getTodayKey();
    const alreadyTracked = localStorage.getItem(todayKey);

    if (!alreadyTracked) {
      apiFetch('/api/visitors/track', { method: 'POST' })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.count != null) {
            setCount(data.count);
            if (data.total != null) setTotal(data.total);
            localStorage.setItem(todayKey, '1');
            cleanOldKeys(todayKey);
          }
        })
        .catch(() => {});
    } else {
      apiFetch('/api/visitors/today')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.count != null) setCount(data.count);
          if (data?.total != null) setTotal(data.total);
        })
        .catch(() => {});
    }
  }, []);

  if (count === null) return null;

  return (
    <div className="visitor-counter">
      <span className="visitor-counter__label">TODAY</span>
      <span className="visitor-counter__count">{count.toLocaleString()}</span>
      {total !== null && (
        <>
          <span className="visitor-counter__sep">|</span>
          <span className="visitor-counter__label">TOTAL</span>
          <span className="visitor-counter__total">{total.toLocaleString()}</span>
        </>
      )}
    </div>
  );
}

function cleanOldKeys(currentKey: string) {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('visitor_tracked_') && key !== currentKey) {
      localStorage.removeItem(key);
    }
  }
}
