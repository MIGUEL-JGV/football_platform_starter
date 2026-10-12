'use client';

import { useState, useTransition } from 'react';
import {
  approveEntryAction,
  rejectEntryAction,
  withdrawEntryAction,
} from '../lib/manage-actions';
import type { TournamentEntry } from '../lib/manage';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export function EntryRow({ tournamentId, entry }: { tournamentId: string; entry: TournamentEntry }) {
  const [status, setStatus] = useState(entry.registrationStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: 'approve' | 'reject' | 'withdraw') {
    setError(null);
    startTransition(async () => {
      const result =
        action === 'approve'
          ? await approveEntryAction(tournamentId, entry.id)
          : action === 'reject'
            ? await rejectEntryAction(tournamentId, entry.id)
            : await withdrawEntryAction(tournamentId, entry.id);
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      setStatus(
        action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'withdrawn',
      );
    });
  }

  return (
    <li className="entry-row">
      <div className="entry-main">
        <strong>{entry.team.name}</strong>
        <p>
          Solicita {entry.requester?.displayName ?? '—'} · {entry._count.roster} en plantilla
        </p>
        {error ? <p className="d-follow-err">{error}</p> : null}
      </div>
      <div className="entry-actions">
        <span className={`status-pill status-${status}`}>
          {STATUS_LABELS[status] ?? status}
        </span>
        {status === 'pending' ? (
          <>
            <button className="btn-sm btn-approve" disabled={pending} onClick={() => run('approve')}>
              Aprobar
            </button>
            <button className="btn-sm btn-reject" disabled={pending} onClick={() => run('reject')}>
              Rechazar
            </button>
          </>
        ) : null}
        <button className="btn-sm btn-ghost" disabled={pending} onClick={() => run('withdraw')}>
          Retirar
        </button>
      </div>
    </li>
  );
}
