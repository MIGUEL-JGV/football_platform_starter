import { cache } from 'react';
import { cookies } from 'next/headers';
import { getMe } from './api';
import type { WebUser } from './api';

export const SESSION_COOKIE = 'cancha.session';
export const AUTHORIZE_COOKIE = 'cancha.authorize';

export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getAuthorizationToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(AUTHORIZE_COOKIE)?.value ?? null;
}

export interface Session {
  user: WebUser;
  token: string;
}

export const getSession = cache(async (): Promise<Session | null> => {
  const token = await getToken();
  if (!token) {
    return null;
  }
  try {
    const user = await getMe(token);
    return { user, token };
  } catch {
    return null;
  }
});