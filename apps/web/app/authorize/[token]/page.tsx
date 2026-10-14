import Link from 'next/link';
import type { FootballFormat, TournamentStatus } from '@football/shared-types';
import { Topbar } from '../../../components/Topbar';
import { ActivateAuthorization } from '../../../components/ActivateAuthorization';
import { getSession } from '../../../lib/auth';
import { resolveAuthorization, type ResolvedAuthorization } from '../../../lib/manage';
import { formatFootball, formatStatus } from '../../../lib/format';

type Params = Promise<{ token: string }>;

const REASON_LABELS: Record<string, string> = {
  not_found: 'El enlace de autorización no existe o ya no está disponible.',
  revoked: 'Este enlace de autorización fue revocado por el organizador.',
  exhausted: 'Este enlace de autorización alcanzó su límite de usos.',
  expired: 'Este enlace de autorización ha vencido.',
};

export default async function AuthorizePage({ params }: { params: Params }) {
  const { token } = await params;
  const session = await getSession();

  let authorization: ResolvedAuthorization;
  try {
    authorization = await resolveAuthorization(token);
  } catch {
    authorization = { valid: false, reason: 'not_found' };
  }

  const tournament = authorization.tournament;

  return (
    <main className="page">
      <Topbar />
      <section className="section">
        {authorization.valid && tournament ? (
          <div className="join-card">
            <p className="eyebrow">AUTORIZACIÓN DE CAMBIOS</p>
            <h2>{tournament.name}</h2>
            <p className="panel-subtitle">
              {formatFootball(tournament.format as FootballFormat)}
              {tournament.location ? ` · ${tournament.location}` : ''}
              {` · ${formatStatus(tournament.status as TournamentStatus)}`}
            </p>
            {authorization.label ? <span className="role-tag">{authorization.label}</span> : null}

            <p className="join-note">
              Este enlace permite aprobar, retirar y editar plantillas de tu propio equipo aunque el
              torneo ya haya iniciado.
              {authorization.remainingUses !== null
                ? ` Quedan ${authorization.remainingUses} usos.`
                : ' Usos ilimitados.'}
            </p>

            {session ? (
              <ActivateAuthorization token={token} tournamentId={tournament.id} />
            ) : (
              <>
                <div className="account-ctas">
                  <Link className="light-button" href="/login">
                    Iniciar sesión
                  </Link>
                  <Link className="login" href="/register">
                    Crear cuenta
                  </Link>
                </div>
                <p className="join-hint">
                  Inicia sesión con el correo de tu equipo para activar la autorización.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="join-card">
            <p className="eyebrow">AUTORIZACIÓN NO DISPONIBLE</p>
            <h2>Enlace inválido</h2>
            <p className="empty">
              {REASON_LABELS[authorization.reason ?? 'not_found'] ?? REASON_LABELS.not_found}
            </p>
            <div className="account-ctas">
              <Link className="light-button" href="/tournaments">
                Ver torneos
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
