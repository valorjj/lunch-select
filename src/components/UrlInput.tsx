import React, { useState } from 'react';
import './UrlInput.scss';

interface UrlInputProps {
  onAdd: (url: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  disabled?: boolean;
}

export function UrlInput({ onAdd, isLoading, error, disabled }: UrlInputProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading || disabled) return;
    await onAdd(url.trim());
    setUrl('');
  };

  return (
    <div className="url-input">
      <form className="url-input__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="url-input__field"
          placeholder="네이버 지도 음식점 URL을 붙여넣기 하세요"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading || disabled}
        />
        <button
          type="submit"
          className="url-input__button"
          disabled={!url.trim() || isLoading || disabled}
        >
          {isLoading ? (
            <span className="url-input__spinner" />
          ) : (
            '추가'
          )}
        </button>
      </form>
      {error && <p className="url-input__error">{error}</p>}
    </div>
  );
}
