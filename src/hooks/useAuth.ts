import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

interface User {
  id: number;
  name: string;
  email: string;
  profileImage: string | null;
  provider: string;
  isAdmin?: boolean;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  login: (provider: 'google' | 'naver' | 'github') => void;
  logout: () => void;
}

const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for token in URL (OAuth callback redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('auth_token', token);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch current user
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiFetch('/api/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem('auth_token');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback((provider: 'google' | 'naver' | 'github') => {
    window.location.href = `${API_BASE}/oauth2/authorization/${provider}`;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setUser(null);
  }, []);

  return { user, isLoading, login, logout };
}
