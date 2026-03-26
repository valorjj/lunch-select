import React, { useState, useCallback } from 'react';
import { Restaurant } from '../../types/restaurant';
import { apiFetch } from '../../utils/api';
import './SharePanel.scss';

interface SharePanelProps {
  winner: Restaurant;
  restaurants: Restaurant[];
}

export function SharePanel({ winner, restaurants }: SharePanelProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const res = await apiFetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantIds: restaurants.map((r) => r.id),
          winnerPlaceId: winner.id,
          gameType: 'ladder',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShareUrl(data.shareUrl);
      }
    } catch { /* ignore */ }
    finally { setIsSharing(false); }
  }, [winner, restaurants]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const handleNativeShare = useCallback(async () => {
    const url = shareUrl || window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: '점심 뭐 먹지?',
        text: `오늘의 점심은 ${winner.name}!`,
        url,
      });
    }
  }, [shareUrl, winner.name]);

  if (!shareUrl) {
    return (
      <div className="share-panel">
        <button
          className="share-panel__generate"
          onClick={handleShare}
          disabled={isSharing}
        >
          {isSharing ? '링크 생성 중...' : '결과 공유하기'}
        </button>
      </div>
    );
  }

  return (
    <div className="share-panel">
      <div className="share-panel__link">
        <input type="text" value={shareUrl} readOnly className="share-panel__url" />
        <button className="share-panel__copy" onClick={handleCopy}>
          {copied ? '복사됨!' : '복사'}
        </button>
      </div>
      {'share' in navigator && (
        <button className="share-panel__native" onClick={handleNativeShare}>
          공유하기
        </button>
      )}
    </div>
  );
}
