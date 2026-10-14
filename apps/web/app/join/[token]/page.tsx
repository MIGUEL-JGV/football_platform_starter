import Link from 'next/link';
import type { FootballFormat } from '@football/shared-types';
import { Topbar } from '../../../components/Topbar';
import { JoinTeamForm, type SquadPlayer } from '../../../components/JoinTeamForm';
import { getSession } from '../../../lib/auth';
import { getTeamProfile } from '../../../lib/api';
import { listMyTeams, resolveInvitation, type MyTeamSummary, type ResolvedInvitation } from '../../../lib/manage';
import { formatFootball } from '../../../lib/format';

type Params = Promise<{ token: string }>;

const REASON_LABELS: Record<string, string> = {
  not_found: 'La invitación no existe o ya no está disponible.',
  revoked: 'Esta invitación fue revocada por el organizador.',
  exhausted: 'Esta invitación alcanzó su límite de usos.',
  expired: 'Esta invitación ha vencido.',
};

export default async function JoinPage({ params }: { params: Params }) {
  const { token } = await params;
  const session = await getSession();

  let invitation: ResolvedInvitation;
  try {
    invitation = await resolveInvitation(token);
  } catch {
    invitation = { valid: false, reason: 'not_found' };
  }

  const tournament = invitation.tournament;

  let teams: MyTeamSummary[] = [];
  if (session && invitation.valid && tournament) {
    try {
      teams = await listMyTeams(session.token);
    } catch {
      teams = [];
    }
  }

  const squads: Record<string, SquadPlayer[]> = {};
  if (session && invitation.valid && tournament && teams.length > 0) {
    await Promise.all(
      teams.map(async (team) => {
        try {
          const profile = await getTeamProfile(team.id);
          squads[team.id] =
            profile?.players.map((player) => ({
              playerId: player.id,
              displayName: player.displayName,
              age: player.age,
              photoUrl: player.photoUrl,
              preferredPosition: player.preferredPosition,
            })) ?? [];
        } catch {
          squads[team.id] = [];
        }
      }),
    );
  }

  return (
    <main className="page">
      <Topbar />
      <section className="section">
        {invitation.valid && tournament ? (
          <div className="join-card">
            <p className="eyebrow">INVITACIÓN A TORNEO</p>
            <h2>{tournament.name}</h2>
            <p className="panel-subtitle">
              {formatFootball(tournament.format as FootballFormat)}
              {tournament.location ? ` · ${tournament.location}` : ''}
              {tournament.maxTeams ? ` · Cupo ${tournament.maxTeams} equipos` : ''}
            </p>
            {invitation.label ? <span className="role-tag">{invitation.label}</span> : null}

            <p className="join-note">
              {invitation.remainingUses === null
                ? 'Inscripción abierta para equipos.'
                : `Quedan ${invitation.remainingUses} lugares disponibles con esta invitación.`}
            </p>

            {session ? (
              <JoinTeamForm
                tournamentId={tournament.id}
                invitationToken={token}
                teams={teams}
                squads={squads}
              />
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
                  Inicia sesión o crea una cuenta con el correo del club para inscribir a tu equipo.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="join-card">
            <p className="eyebrow">INVITACIÓN NO DISPONIBLE</p>
            <h2>Enlace inválido</h2>
            <p className="empty">
              {REASON_LABELS[invitation.reason ?? 'not_found'] ?? REASON_LABELS.not_found}
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
