'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { registerAction } from '../../lib/actions';
import type { AuthState } from '../../lib/actions';

export default function RegisterPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, {});

  return (
    <main className="auth-page">
      <Link className="d-back" href="/">← Volver al catálogo</Link>
      <div className="auth-card">
        <p className="eyebrow">CANCHA+ · REGISTRO</p>
        <h1>Crea tu cuenta</h1>
        <p className="auth-note">Únete para seguir torneos e inscribir tus equipos.</p>
        <form action={action} className="auth-form">
          <label className="field">
            <span>Nombre</span>
            <input name="displayName" type="text" autoComplete="name" placeholder="Tu nombre" required minLength={2} maxLength={120} />
          </label>
          <label className="field">
            <span>Correo electrónico</span>
            <input name="email" type="email" autoComplete="email" placeholder="tu@correo.com" required />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input name="password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" required minLength={8} maxLength={72} />
          </label>
          {state.error ? <p className="auth-error" role="alert">{state.error}</p> : null}
          <button className="btn" type="submit" disabled={pending}>
            {pending ? 'Creando…' : 'Crear cuenta'}
          </button>
        </form>
        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link href="/login">Iniciar sesión</Link>
        </p>
      </div>
    </main>
  );
}