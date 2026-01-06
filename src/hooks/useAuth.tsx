'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { api } from '@/services/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Subscription {
  id: string;
  status: string;
  plan: 'monthly' | 'semiannual' | 'annual';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  subscription: Subscription | null;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      const data = await api.get<{ hasSubscription: boolean; isActive: boolean; subscription: Subscription | null }>('/subscriptions/status');
      setSubscription(data.subscription);
      setHasActiveSubscription(data.isActive);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      setSubscription(null);
      setHasActiveSubscription(false);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: User }>('/auth/me');
      setUser(data.user);
      await fetchSubscription();
    } catch (error) {
      console.error('Failed to fetch user:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [fetchSubscription]);

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
    setSubscription(null);
    setHasActiveSubscription(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  };

  const refreshSubscription = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

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
        hasActiveSubscription,
        subscription,
        refreshSubscription,
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

