'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { api } from '@/services/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        fetchUser();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    setToken(data.token);
    setUser(data.user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.token);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/register', {
      name,
      email,
      password,
    });
    setToken(data.token);
    setUser(data.user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.token);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

