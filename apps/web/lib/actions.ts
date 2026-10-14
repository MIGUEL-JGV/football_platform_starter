'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getToken, SESSION_COOKIE } from './auth';
import { followTournament, login, register, unfollowTournament } from './api';

export interface AuthState {
  error?: string;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 12,
};

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) {
    return { error: 'Ingresa tu correo y contraseña.' };
  }
  try {
    const result = await login(email, password);
    const store = await cookies();
    store.set(SESSION_COOKIE, result.accessToken, COOKIE_OPTIONS);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo iniciar sesión.' };
  }
  redirect('/mis-torneos');
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  if (!email || !password) {
    return { error: 'Ingresa tu correo y contraseña.' };
  }
  if (displayName.length < 2) {
    return { error: 'El nombre debe tener al menos 2 caracteres.' };
  }
  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  try {
    const result = await register(email, password, displayName);
    const store = await cookies();
    store.set(SESSION_COOKIE, result.accessToken, COOKIE_OPTIONS);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la cuenta.';
    return { error: message };
  }
  redirect('/mis-torneos');
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/');
}

export async function toggleFollowAction(
  tournamentId: string,
  wasFollowing: boolean,
): Promise<{ following: boolean; error?: string }> {
  const token = await getToken();
  if (!token) {
    return { following: wasFollowing, error: 'auth' };
  }
  try {
    if (wasFollowing) {
      await unfollowTournament(token, tournamentId);
    } else {
      await followTournament(token, tournamentId);
    }
    revalidatePath(`/tournaments/${tournamentId}`);
    return { following: !wasFollowing };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el seguimiento.';
    return { following: wasFollowing, error: message === 'auth' ? 'auth' : message };
  }
}