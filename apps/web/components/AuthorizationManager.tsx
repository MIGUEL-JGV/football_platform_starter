'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearAuthorizationAction,
  createAuthorizationAction,
  revokeAuthorizationAction,
} from '../lib/manage-actions';
import type { CreatedAuthorization, TournamentAuthorization } from '../lib/manage';

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  revoked: 'Revocado',
};

export function AuthorizationManager({
  tournamentId,
  authorizations,
  hasActiveAuthorization,
}: {
  tournamentId: string;
  authorizations: TournamentAuthorization[];
  hasActiveAuthorization: boolean;
}) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [secret, setSecret] = useState<CreatedAuthorization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await createAuthorizationAction(tournamentId, {
        label: label.trim() || undefined,
        maxUses: maxUses ? Number(maxUses) : undefined,
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      });
      if (!result.ok || !result.authorization) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      setSecret(result.authorization);
      setLabel('');
      setMaxUses('');
      setExpiresInDays('');
      router.refresh();
    });
  }

  function revoke(authorizationId: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokeAuthorizationAction(tournamentId, authorizationId);
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      router.refresh();
    });
  }

  function deactivate() {
    startTransition(async () => {
      await clearAuthorizationAction();
      router.refresh();
    });
  }

  async function copy() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret.authorizeUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="d-block">
      <div className="section-heading">
        <h3>Autorización post-inicio</h3>
        <span className="result-count">{authorizations.length}</span>
      </div>
      <p className="panel-subtitle">
        Solo el creador del torneo puede generar un enlace. Quien lo tenga podrá aprobar, retirar y
        editar plantillas de su propio equipo aunque el torneo ya haya iniciado.
      </p>

      {hasActiveAuthorization ? (
        <p className="entry-meta">
          Este navegador tiene un enlace de autorización activo.{' '}
          <button className="btn-sm btn-ghost" disabled={pending} onClick={deactivate}>
            Quitar
          </button>
        </p>
      ) : null}

      <div className="invite-form">
        <input
          className="field-input"
          placeholder="Etiqueta (ej. Ajustes finales)"
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
          {pending ? '…' : 'Generar enlace'}
        </button>
      </div>
      {error ? <p className="d-follow-err">{error}</p> : null}

      {secret ? (
        <div className="invite-secret">
          <div className="invite-secret-body">
            <p className="invite-secret-title">Comparte este enlace (solo se muestra una vez)</p>
            <code className="invite-link">{secret.authorizeUrl}</code>
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
          <img className="invite-qr" src={secret.qrDataUrl} alt="Código QR de la autorización" />
        </div>
      ) : null}

      {authorizations.length === 0 ? (
        <p className="empty">
          No hay enlaces de autorización. Genera uno si necesitas hacer cambios tras iniciar el
          torneo.
        </p>
      ) : (
        <ul className="entry-list">
          {authorizations.map((authorization) => (
            <li className="entry-row" key={authorization.id}>
              <div className="entry-main">
                <strong>{authorization.label ?? 'Sin etiqueta'}</strong>
                <p>
                  {authorization.maxUses === null
                    ? `${authorization.usedCount} usos`
                    : `${authorization.usedCount}/${authorization.maxUses} usos`}
                  {authorization.expiresAt
                    ? ` · vence ${new Date(authorization.expiresAt).toLocaleDateString('es-MX')}`
                    : ''}
                </p>
              </div>
              <div className="entry-actions">
                <span className={`status-pill status-${statusClass(authorization.status)}`}>
                  {STATUS_LABELS[authorization.status] ?? authorization.status}
                </span>
                {authorization.status !== 'revoked' ? (
                  <button
                    className="btn-sm btn-reject"
                    disabled={pending}
                    onClick={() => revoke(authorization.id)}
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
  return status === 'active' ? 'approved' : 'rejected';
}
