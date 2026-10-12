import type { ReactNode } from 'react';
import Link from 'next/link';
import { getSession } from '../lib/auth';
import { logoutAction } from '../lib/actions';

export async function Topbar({ nav }: { nav?: ReactNode }) {
  const session = await getSession();
  return (
    <header className="topbar">
      <Link className="brand" href="/">CANCHA<span>+</span></Link>
      <nav>{nav ?? <><Link href="/">Inicio</Link><Link href="/tournaments">Torneos</Link></>}</nav>
      {session ? (
        <div className="account">
          <Link className="account-link" href="/mis-torneos">Mis torneos</Link>
          <Link className="account-link" href="/panel">Panel</Link>
          <span className="account-name" title={session.user.email}>{session.user.displayName}</span>
          <form action={logoutAction}>
            <button className="logout" type="submit">Salir</button>
          </form>
        </div>
      ) : (
        <div className="account">
          <Link className="login" href="/login">Iniciar sesión</Link>
          <Link className="login" href="/register">Crear cuenta</Link>
        </div>
      )}
    </header>
  );
}