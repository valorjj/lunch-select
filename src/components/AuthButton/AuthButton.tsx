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
  onLogin: (provider: 'google' | 'naver') => void;
  onLogout: () => void;
}

export function AuthButton({ user, isLoading, onLogin, onLogout }: AuthButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showProviders, setShowProviders] = useState(false);

  if (isLoading) return null;

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
            className="auth-button__menu-item auth-button__menu-item--naver"
            onClick={() => onLogin('naver')}
          >
            네이버 로그인
          </button>
        </div>
      )}
    </div>
  );
}
