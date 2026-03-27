import React, { useState, useCallback, useMemo } from 'react';
import { Restaurant } from '../../types/restaurant';
import './SharePanel.scss';

interface SharePanelProps {
  winner: Restaurant;
  restaurants: Restaurant[];
}

function buildShareUrl(winner: Restaurant): string {
  const data = {
    n: winner.name,
    c: winner.category || '',
    a: winner.roadAddress || winner.address || '',
    p: winner.phone || '',
    id: winner.id,
    t: winner.thumbnail || '',
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  return `${window.location.origin}?result=${encoded}`;
}

export function SharePanel({ winner, restaurants }: SharePanelProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => buildShareUrl(winner), [winner]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [shareUrl]);

  return (
    <div className="share-panel">
      <button
        className="share-panel__generate"
        onClick={handleCopy}
      >
        {copied ? '복사됨! ✓' : '결과 복사하기'}
      </button>
    </div>
  );
}

/** Decode a shared result from URL query param */
export function decodeSharedResult(encoded: string): Restaurant | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const data = JSON.parse(json);
    return {
      id: data.id || '',
      name: data.n || '',
      category: data.c || '',
      menuItems: [],
      thumbnail: data.t || '',
      address: data.a || '',
      roadAddress: data.a || '',
      lat: 0,
      lng: 0,
      phone: data.p || '',
      naverMapUrl: '',
    };
  } catch {
    return null;
  }
}
