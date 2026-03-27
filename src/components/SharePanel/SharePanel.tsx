import React, { useState, useCallback } from 'react';
import { Restaurant } from '../../types/restaurant';
import './SharePanel.scss';

interface SharePanelProps {
  winner: Restaurant;
  restaurants: Restaurant[];
}

export function SharePanel({ winner, restaurants }: SharePanelProps) {
  const [copied, setCopied] = useState(false);

  const shareText = `[점심 뭐 먹지?] 오늘의 점심은 "${winner.name}"! 🎉${
    winner.category ? `\n분류: ${winner.category}` : ''
  }${
    winner.roadAddress ? `\n주소: ${winner.roadAddress}` : ''
  }${
    /^\d+$/.test(winner.id) ? `\nhttps://m.place.naver.com/restaurant/${winner.id}/home` : ''
  }`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [shareText]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '점심 뭐 먹지?',
          text: shareText,
        });
      } catch { /* user cancelled */ }
    }
  }, [shareText]);

  return (
    <div className="share-panel">
      <button
        className="share-panel__generate"
        onClick={handleCopy}
      >
        {copied ? '복사됨! ✓' : '결과 복사하기'}
      </button>
      {'share' in navigator && (
        <button className="share-panel__native" onClick={handleNativeShare}>
          공유하기
        </button>
      )}
    </div>
  );
}
