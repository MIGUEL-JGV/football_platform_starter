import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMeRequest, loginRequest, registerRequest, PublicUser } from '../api/auth';
import { clearToken, loadToken, saveToken } from './token';

type AuthStatus = 'loading' | 'authenticated' | 'guest';

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await loadToken();
      if (!stored) {
        if (active) setStatus('guest');
        return;
      }
      try {
        const me = await getMeRequest(stored);
        if (!active) return;
        setToken(stored);
        setUser(me);
        setStatus('authenticated');
      } catch {
        await clearToken();
        if (active) {
          setToken(null);
          setUser(null);
          setStatus('guest');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const applyAuth = useCallback(async (accessToken: string, nextUser: PublicUser) => {
    await saveToken(accessToken);
    setToken(accessToken);
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await loginRequest(email, password);
      await applyAuth(result.accessToken, result.user);
    },
    [applyAuth],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const result = await registerRequest(email, password, displayName);
      await applyAuth(result.accessToken, result.user);
    },
    [applyAuth],
  );

  const signOut = useCallback(async () => {
    await clearToken();
    setToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const me = await getMeRequest(token);
    setUser(me);
  }, [token]);

  const value = useMemo(
    () => ({ status, user, token, signIn, signUp, signOut, refreshUser }),
    [status, user, token, signIn, signUp, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}