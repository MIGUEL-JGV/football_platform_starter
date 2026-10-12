'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction } from '../../lib/actions';
import type { AuthState } from '../../lib/actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <main className="auth-page">
      <Link className="d-back" href="/">← Volver al catálogo</Link>
      <div className="auth-card">
        <p className="eyebrow">CANCHA+ · ACCESO</p>
        <h1>Accede a tu espacio</h1>
        <p className="auth-note">Consulta tus torneos, sigue tus favoritos y gestiona tus competiciones.</p>
        <form action={action} className="auth-form">
          <label className="field">
            <span>Correo electrónico</span>
            <input name="email" type="email" autoComplete="email" placeholder="tu@correo.com" required />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
          </label>
          {state.error ? <p className="auth-error" role="alert">{state.error}</p> : null}
          <button className="btn" type="submit" disabled={pending}>
            {pending ? 'Iniciando…' : 'Iniciar sesión'}
          </button>
        </form>
        <p className="auth-switch">
          ¿No tienes cuenta? <Link href="/register">Crear cuenta</Link>
        </p>
      </div>
    </main>
  );
}