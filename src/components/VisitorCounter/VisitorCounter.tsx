import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import './VisitorCounter.scss';

export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    // Track visit and get count
    const tracked = sessionStorage.getItem('visitor_tracked');
    if (!tracked) {
      apiFetch('/api/visitors/track', { method: 'POST' })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.count != null) {
            setCount(data.count);
            sessionStorage.setItem('visitor_tracked', '1');
          }
        })
        .catch(() => {});
    } else {
      apiFetch('/api/visitors/today')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.count != null) setCount(data.count);
        })
        .catch(() => {});
    }
  }, []);

  if (count === null) return null;

  return (
    <div className="visitor-counter">
      <span className="visitor-counter__label">TODAY</span>
      <span className="visitor-counter__count">{count.toLocaleString()}</span>
    </div>
  );
}
