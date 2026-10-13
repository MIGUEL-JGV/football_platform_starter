import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Topbar } from '../../../../components/Topbar';
import { AuthorizationManager } from '../../../../components/AuthorizationManager';
import { EntryRow } from '../../../../components/EntryActions';
import { InvitationManager } from '../../../../components/InvitationManager';
import { MatchManager } from '../../../../components/MatchManager';
import { NewsManager } from '../../../../components/NewsManager';
import { PhaseManager } from '../../../../components/PhaseManager';
import { TournamentStatusControls } from '../../../../components/TournamentStatusControls';
import { getAuthorizationToken, getSession } from '../../../../lib/auth';
import { getTournamentDetail } from '../../../../lib/api';
import {
  listAuthorizations,
  listEntries,
  listEntryRoster,
  listInvitations,
  listManageMatches,
  listManageNews,
  listMatchdays,
  listPhases,
  type ManageMatch,
  type ManageNewsPost,
  type Matchday,
  type Phase,
  type RosterPlayer,
  type TournamentAuthorization,
  type TournamentEntry,
  type TournamentInvitation,
} from '../../../../lib/manage';
import { formatFootball, formatStatus } from '../../../../lib/format';

type Params = Promise<{ id: string }>;

export default async function ManageTournamentPage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    notFound();
  }

  let entries: TournamentEntry[] = [];
  let invitations: TournamentInvitation[] = [];
  let authorizations: TournamentAuthorization[] = [];
  let phases: Phase[] = [];
  let matches: ManageMatch[] = [];
  let news: ManageNewsPost[] = [];
  const matchdaysByPhase: Record<string, Matchday[]> = {};
  let detail: Awaited<ReturnType<typeof getTournamentDetail>>;
  try {
    detail = await getTournamentDetail(id, session.token);
  } catch {
    notFound();
  }
  if (!detail.canManage) {
    notFound();
  }
  try {
    entries = await listEntries(session.token, id);
  } catch {
    entries = [];
  }
  const rostersByEntry: Record<string, RosterPlayer[]> = {};
  if (entries.length > 0) {
    await Promise.all(
      entries.map(async (entry) => {
        try {
          rostersByEntry[entry.id] = await listEntryRoster(session.token, id, entry.id);
        } catch {
          rostersByEntry[entry.id] = [];
        }
      }),
    );
  }
  const rostersByTeam = rostersByEntry;
  try {
    invitations = await listInvitations(session.token, id);
  } catch {
    invitations = [];
  }
  if (detail.myOrgRole === 'owner') {
    try {
      authorizations = await listAuthorizations(session.token, id);
    } catch {
      authorizations = [];
    }
  }
  const hasActiveAuthorization = (await getAuthorizationToken()) !== null;
  try {
    phases = await listPhases(session.token, id);
    for (const phase of phases) {
      matchdaysByPhase[phase.id] = await listMatchdays(session.token, id, phase.id);
    }
  } catch {
    phases = [];
  }
  try {
    matches = await listManageMatches(session.token, id);
  } catch {
    matches = [];
  }
  try {
    news = (await listManageNews(session.token, id)).items;
  } catch {
    news = [];
  }

  const pending = entries.filter((e) => e.registrationStatus === 'pending');
  const approved = entries.filter((e) => e.registrationStatus === 'approved');
  const rejected = entries.filter((e) => e.registrationStatus === 'rejected');
  const groups: Array<[string, TournamentEntry[]]> = [
    ['Pendientes', pending],
    ['Aprobadas', approved],
    ['Rechazadas', rejected],
  ];

  return (
    <main className="page">
      <Topbar />
      <section className="section">
        <Link className="d-back" href="/panel">← Panel</Link>
        <div className="section-heading">
          <div>
            <p className="eyebrow">{detail.organization.name}</p>
            <h2>{detail.name}</h2>
            <p className="panel-subtitle">
              {formatFootball(detail.format)} · {formatStatus(detail.status)}
              {detail.maxTeams ? ` · Cupo ${approved.length}/${detail.maxTeams}` : ` · ${approved.length} aprobadas`}
            </p>
          </div>
          <Link className="panel-link" href={`/tournaments/${id}`}>Ver ficha pública ↗</Link>
        </div>

        <TournamentStatusControls
          organizationId={detail.organization.id}
          tournamentId={id}
          status={detail.status}
        />

        <div className="d-block">
          <div className="section-heading">
            <h3>Inscripciones</h3>
            <span className="result-count">{entries.length}</span>
          </div>
          {entries.length === 0 ? (
            <p className="empty">Todavía no hay inscripciones en este torneo.</p>
          ) : (
            groups
              .filter(([, list]) => list.length > 0)
              .map(([label, list]) => (
<div className="entry-group" key={label}>
                    <p className="entry-group-title">{label} · {list.length}</p>
                    <ul className="entry-list">
                      {list.map((entry) => (
                        <EntryRow
                          key={entry.id}
                          tournamentId={id}
                          entry={entry}
                          roster={rostersByEntry[entry.id] ?? []}
                        />
                      ))}
                    </ul>
                  </div>
              ))
          )}
        </div>

        <InvitationManager tournamentId={id} invitations={invitations} />

        {detail.myOrgRole === 'owner' ? (
          <AuthorizationManager
            tournamentId={id}
            authorizations={authorizations}
            hasActiveAuthorization={hasActiveAuthorization}
          />
        ) : null}

        <PhaseManager
          tournamentId={id}
          phases={phases}
          matchdaysByPhase={matchdaysByPhase}
        />

        <MatchManager
          tournamentId={id}
          matches={matches}
          phases={phases}
          matchdaysByPhase={matchdaysByPhase}
          approvedEntries={approved}
          rostersByTeam={rostersByTeam}
        />

        <NewsManager tournamentId={id} posts={news} />
      </section>
    </main>
  );
}
