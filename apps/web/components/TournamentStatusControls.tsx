'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateTournamentStatusAction } from '../lib/manage-actions';

const LOCKED_STATUSES = new Set(['in_progress', 'completed', 'cancelled']);

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  registration: 'Inscripciones abiertas',
  upcoming: 'Próximo',
  in_progress: 'En juego',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

export function TournamentStatusControls({
  organizationId,
  tournamentId,
  status,
}: {
  organizationId: string;
  tournamentId: string;
  status: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = !LOCKED_STATUSES.has(current);

  function change(next: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateTournamentStatusAction(organizationId, tournamentId, next);
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      setCurrent(result.status ?? next);
      router.refresh();
    });
  }

  return (
    <div className="d-block">
      <div className="section-heading">
        <h3>Estado del torneo</h3>
        <span className={`status-pill status-${open ? 'approved' : 'pending'}`}>
          {STATUS_LABELS[current] ?? current}
        </span>
      </div>

      {open ? (
        <>
          <p className="panel-subtitle">
            Inscripciones y plantillas abiertas. Al iniciar el torneo se bloquean los cambios y solo
            podrán desbloquearse con un enlace de autorización.
          </p>
          <div className="entry-actions">
            <button
              className="btn-sm btn-approve"
              disabled={pending}
              onClick={() => change('in_progress')}
            >
              {pending ? '…' : 'Iniciar torneo'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="panel-subtitle">
            Cambios bloqueados. Genera un enlace de autorización más abajo para permitir altas y bajas
            puntuales.
          </p>
          <div className="entry-actions">
            {current === 'in_progress' ? (
              <button
                className="btn-sm btn-approve"
                disabled={pending}
                onClick={() => change('completed')}
              >
                {pending ? '…' : 'Finalizar torneo'}
              </button>
            ) : null}
            <button
              className="btn-sm btn-ghost"
              disabled={pending}
              onClick={() => change('registration')}
            >
              Reabrir inscripciones
            </button>
          </div>
        </>
      )}
      {error ? <p className="d-follow-err">{error}</p> : null}
    </div>
  );
}
