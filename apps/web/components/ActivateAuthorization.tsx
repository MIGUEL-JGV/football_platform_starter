'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { activateAuthorizationAction } from '../lib/manage-actions';

export function ActivateAuthorization({
  token,
  tournamentId,
}: {
  token: string;
  tournamentId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function activate() {
    startTransition(async () => {
      await activateAuthorizationAction(token);
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="join-register">
        <p className="join-success">✓ Autorización activada en este navegador.</p>
        <p className="join-hint">
          Ya puedes inscribir, aprobar, retirar y editar plantillas aunque el torneo haya iniciado.
        </p>
        <div className="account-ctas">
          <Link className="light-button" href={`/panel/tournaments/${tournamentId}`}>
            Ir al panel del torneo
          </Link>
          <Link className="login" href={`/tournaments/${tournamentId}`}>
            Ver torneo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="join-register">
      <button className="btn-sm btn-approve" disabled={pending} onClick={activate}>
        {pending ? 'Activando…' : 'Activar en este navegador'}
      </button>
    </div>
  );
}
