'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createInvitationAction,
  regenerateInvitationAction,
  revokeInvitationAction,
} from '../lib/manage-actions';
import type { CreatedInvitation, TournamentInvitation } from '../lib/manage';

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  revoked: 'Revocada',
  exhausted: 'Agotada',
};

export function InvitationManager({
  tournamentId,
  invitations,
}: {
  tournamentId: string;
  invitations: TournamentInvitation[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [secret, setSecret] = useState<CreatedInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await createInvitationAction(tournamentId, {
        label: label.trim() || undefined,
        maxUses: maxUses ? Number(maxUses) : undefined,
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      });
      if (!result.ok || !result.invitation) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      setSecret(result.invitation);
      setLabel('');
      setMaxUses('');
      router.refresh();
    });
  }

  function regenerate(invitationId: string) {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await regenerateInvitationAction(tournamentId, invitationId);
      if (!result.ok || !result.invitation) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      setSecret(result.invitation);
      router.refresh();
    });
  }

  function revoke(invitationId: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokeInvitationAction(tournamentId, invitationId);
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      router.refresh();
    });
  }

  async function copy() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret.joinUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="d-block">
      <div className="section-heading">
        <h3>Invitaciones</h3>
        <span className="result-count">{invitations.length}</span>
      </div>

      <div className="invite-form">
        <input
          className="field-input"
          placeholder="Etiqueta (ej. Liga 2026)"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <input
          className="field-input"
          placeholder="Usos máx."
          inputMode="numeric"
          value={maxUses}
          onChange={(event) => setMaxUses(event.target.value.replace(/\D/g, ''))}
        />
        <input
          className="field-input"
          placeholder="Vence en días"
          inputMode="numeric"
          value={expiresInDays}
          onChange={(event) => setExpiresInDays(event.target.value.replace(/\D/g, ''))}
        />
        <button className="btn-sm btn-approve" disabled={pending} onClick={create}>
          {pending ? '…' : 'Generar invitación'}
        </button>
      </div>
      {error ? <p className="d-follow-err">{error}</p> : null}

      {secret ? (
        <div className="invite-secret">
          <div className="invite-secret-body">
            <p className="invite-secret-title">Comparte este enlace (solo se muestra una vez)</p>
            <code className="invite-link">{secret.joinUrl}</code>
            <div className="invite-secret-actions">
              <button className="btn-sm btn-ghost" onClick={copy}>
                {copied ? 'Copiado ✓' : 'Copiar enlace'}
              </button>
              {secret.maxUses !== null ? (
                <span className="entry-meta">Límite: {secret.maxUses} usos</span>
              ) : (
                <span className="entry-meta">Usos ilimitados</span>
              )}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="invite-qr" src={secret.qrDataUrl} alt="Código QR de la invitación" />
        </div>
      ) : null}

      {invitations.length === 0 ? (
        <p className="empty">Aún no hay invitaciones. Genera una para que los equipos se inscriban.</p>
      ) : (
        <ul className="entry-list">
          {invitations.map((invitation) => (
            <li className="entry-row" key={invitation.id}>
              <div className="entry-main">
                <strong>{invitation.label ?? 'Sin etiqueta'}</strong>
                <p>
                  {invitation.maxUses === null
                    ? `${invitation.usedCount} usos`
                    : `${invitation.usedCount}/${invitation.maxUses} usos`}
                  {` · ${invitation.entriesCount} inscritos`}
                  {invitation.expiresAt
                    ? ` · vence ${new Date(invitation.expiresAt).toLocaleDateString('es-MX')}`
                    : ''}
                </p>
              </div>
              <div className="entry-actions">
                <span className={`status-pill status-${statusClass(invitation.status)}`}>
                  {STATUS_LABELS[invitation.status] ?? invitation.status}
                </span>
                <button
                  className="btn-sm btn-ghost"
                  disabled={pending}
                  onClick={() => regenerate(invitation.id)}
                >
                  Regenerar
                </button>
                {invitation.status !== 'revoked' ? (
                  <button
                    className="btn-sm btn-reject"
                    disabled={pending}
                    onClick={() => revoke(invitation.id)}
                  >
                    Revocar
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusClass(status: string): string {
  if (status === 'active') return 'approved';
  if (status === 'revoked') return 'rejected';
  return 'pending';
}
