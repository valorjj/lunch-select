import React from 'react';
import './GlobalLoader.scss';

interface GlobalLoaderProps {
  visible: boolean;
  message?: string;
}

export function GlobalLoader({ visible, message }: GlobalLoaderProps) {
  if (!visible) return null;

  return (
    <div className="global-loader">
      <div className="global-loader__backdrop" />
      <div className="global-loader__content">
        <div className="global-loader__spinner">
          <div className="global-loader__ring" />
          <div className="global-loader__ring" />
          <div className="global-loader__ring" />
        </div>
        {message && <p className="global-loader__message">{message}</p>}
      </div>
    </div>
  );
}
