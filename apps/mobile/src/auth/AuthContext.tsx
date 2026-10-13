import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMeRequest, loginRequest, registerRequest, PublicUser } from '../api/auth';
import { setAuthorizationToken } from '../api/authorization';
import {
  clearAuthorizationToken,
  clearToken,
  loadAuthorizationToken,
  loadToken,
  saveAuthorizationToken,
  saveToken,
} from './token';

type AuthStatus = 'loading' | 'authenticated' | 'guest';

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  token: string | null;
  authorizationToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  activateAuthorization: (token: string) => Promise<void>;
  clearAuthorization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authorizationToken, setAuthorizationTokenState] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await loadToken();
      const storedAuthorization = await loadAuthorizationToken();
      if (active) {
        setAuthorizationToken(storedAuthorization);
        setAuthorizationTokenState(storedAuthorization);
      }
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
    await clearAuthorizationToken();
    setAuthorizationToken(null);
    setToken(null);
    setUser(null);
    setAuthorizationTokenState(null);
    setStatus('guest');
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const me = await getMeRequest(token);
    setUser(me);
  }, [token]);

  const activateAuthorization = useCallback(async (nextToken: string) => {
    await saveAuthorizationToken(nextToken);
    setAuthorizationToken(nextToken);
    setAuthorizationTokenState(nextToken);
  }, []);

  const clearAuthorization = useCallback(async () => {
    await clearAuthorizationToken();
    setAuthorizationToken(null);
    setAuthorizationTokenState(null);
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      token,
      authorizationToken,
      signIn,
      signUp,
      signOut,
      refreshUser,
      activateAuthorization,
      clearAuthorization,
    }),
    [
      status,
      user,
      token,
      authorizationToken,
      signIn,
      signUp,
      signOut,
      refreshUser,
      activateAuthorization,
      clearAuthorization,
    ],
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