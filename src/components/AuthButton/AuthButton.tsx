import React, { useState } from 'react';
import './AuthButton.scss';

interface User {
  id: number;
  name: string;
  email: string;
  profileImage: string | null;
  provider: string;
}

interface AuthButtonProps {
  user: User | null;
  isLoading: boolean;
  onLogin: (provider: 'google' | 'naver' | 'github') => void;
  onLogout: () => void;
}

export function AuthButton({ user, isLoading, onLogin, onLogout }: AuthButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showProviders, setShowProviders] = useState(false);

  if (isLoading) {
    return (
      <div className="auth-button auth-button--loading">
        <div className="auth-button__placeholder" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-button">
        <button
          className="auth-button__profile"
          onClick={() => setShowMenu(!showMenu)}
        >
          {user.profileImage ? (
            <img src={user.profileImage} alt={user.name} className="auth-button__avatar" />
          ) : (
            <span className="auth-button__avatar-placeholder">
              {user.name.charAt(0)}
            </span>
          )}
          <span className="auth-button__name">{user.name}</span>
        </button>
        {showMenu && (
          <div className="auth-button__menu">
            <div className="auth-button__menu-header">
              <span className="auth-button__menu-email">{user.email}</span>
            </div>
            <button className="auth-button__menu-item" onClick={() => { onLogout(); setShowMenu(false); }}>
              로그아웃
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="auth-button">
      <button
        className="auth-button__login"
        onClick={() => setShowProviders(!showProviders)}
      >
        로그인
      </button>
      {showProviders && (
        <div className="auth-button__menu">
          <button
            className="auth-button__menu-item auth-button__menu-item--google"
            onClick={() => onLogin('google')}
          >
            Google 로그인
          </button>
          <button
            className="auth-button__menu-item auth-button__menu-item--github"
            onClick={() => onLogin('github')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{verticalAlign: 'middle', marginRight: '6px'}}>
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub 로그인
          </button>
        </div>
      )}
    </div>
  );
}
