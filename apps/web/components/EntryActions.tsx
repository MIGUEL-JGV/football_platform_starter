'use client';

import { useState, useTransition } from 'react';
import {
  approveEntryAction,
  rejectEntryAction,
  withdrawEntryAction,
} from '../lib/manage-actions';
import type { RosterPlayer, TournamentEntry } from '../lib/manage';
import { formatDateTime } from '../lib/format';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Portero',
  defender: 'Defensa',
  midfielder: 'Mediocampista',
  forward: 'Delantero',
};

export function EntryRow({
  tournamentId,
  entry,
  roster,
}: {
  tournamentId: string;
  entry: TournamentEntry;
  roster: RosterPlayer[];
}) {
  const [status, setStatus] = useState(entry.registrationStatus);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  const consentsOk = roster.every(
    (row) => !row.isMinor || row.consents.some((consent) => consent.granted),
  );
  const missingConsents = roster.filter(
    (row) => row.isMinor && !row.consents.some((consent) => consent.granted),
  );

  function run(action: 'approve' | 'reject' | 'withdraw') {
    setError(null);
    startTransition(async () => {
      const result =
        action === 'approve'
          ? await approveEntryAction(tournamentId, entry.id)
          : action === 'reject'
            ? await rejectEntryAction(
                tournamentId,
                entry.id,
                reason.trim() === '' ? undefined : reason.trim(),
              )
            : await withdrawEntryAction(tournamentId, entry.id);
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      if (action === 'reject' && result.ok) {
        setShowReject(false);
        setReason('');
      }
      setStatus(
        action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'withdrawn',
      );
    });
  }

  return (
    <li className="entry-row">
      <div className="entry-main">
        <div className="entry-head">
          <strong>{entry.team.name}</strong>
          {roster.length > 0 ? (
            <span className={`consent-chip${consentsOk && missingConsents.length === 0 ? ' consent-ok' : ' consent-warn'}`}>
              {consentsOk && missingConsents.length === 0
                ? `${roster.length} en plantilla · consentimientos OK`
                : `${roster.length} en plantilla · ${missingConsents.length} sin consentimiento`}
            </span>
          ) : (
            <span className="consent-chip">Sin plantilla enviada</span>
          )}
        </div>
        <p>
          Solicita {entry.requester?.displayName ?? '—'}
          {entry.submittedAt ? ` · enviada ${formatDateTime(entry.submittedAt)}` : ''}
          {entry.representativeName ? ` · ${entry.representativeName}` : ''}
        </p>
        {status === 'rejected' && entry.reviewNote ? (
          <p className="entry-review-note">Motivo de rechazo: {entry.reviewNote}</p>
        ) : null}
        {error ? <p className="d-follow-err">{error}</p> : null}
        {roster.length > 0 ? (
          <button className="entry-toggle" onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Ocultar plantilla' : 'Ver plantilla'} ({roster.length})
          </button>
        ) : null}
        {expanded && roster.length > 0 ? (
          <ul className="review-roster">
            {roster.map((row) => {
              const hasConsent = row.consents.some((consent) => consent.granted);
              const consent = row.consents.find((consent) => consent.granted);
              return (
                <li key={row.id} className="review-player">
                  <span className="review-num">{row.jerseyNumber ?? '—'}</span>
                  <span className="review-name">{row.player.displayName}</span>
                  <span className="review-pos">
                    {row.position ? (POSITION_LABELS[row.position] ?? row.position) : row.player.preferredPosition ? (POSITION_LABELS[row.player.preferredPosition] ?? row.player.preferredPosition) : ''}
                  </span>
                  {row.isMinor ? (
                    hasConsent ? (
                      <span className="consent-tag consent-tag-ok">
                        Consentimiento · {consent?.guardianName}
                        {consent?.guardianRelation ? ` (${consent.guardianRelation})` : ''}
                      </span>
                    ) : (
                      <span className="consent-tag consent-tag-missing">Menor sin consentimiento</span>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      <div className="entry-actions">
        <span className={`status-pill status-${status}`}>
          {STATUS_LABELS[status] ?? status}
        </span>
        {status === 'pending' ? (
          <>
            {showReject ? (
              <div className="reject-box">
                <input
                  className="field-input"
                  placeholder="Motivo del rechazo"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <div className="reject-box-actions">
                  <button className="btn-sm btn-reject" disabled={pending} onClick={() => run('reject')}>
                    Confirmar rechazo
                  </button>
                  <button className="btn-sm btn-ghost" disabled={pending} onClick={() => setShowReject(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button className="btn-sm btn-approve" disabled={pending} onClick={() => run('approve')}>
                  Aprobar
                </button>
                <button className="btn-sm btn-reject" disabled={pending} onClick={() => setShowReject(true)}>
                  Rechazar
                </button>
              </>
            )}
          </>
        ) : null}
        <button className="btn-sm btn-ghost" disabled={pending} onClick={() => run('withdraw')}>
          Retirar
        </button>
      </div>
    </li>
  );
}