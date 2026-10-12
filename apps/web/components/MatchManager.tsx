'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearResultAction,
  createMatchAction,
  recordResultAction,
  validateResultAction,
} from '../lib/manage-actions';
import {
  MATCH_STATUS_LABELS,
  type ManageMatch,
  type MatchStatus,
  type Matchday,
  type Phase,
  type RosterPlayer,
  type TournamentEntry,
} from '../lib/manage';
import { MatchEventEditor } from './MatchEventEditor';

const RECORDABLE: MatchStatus[] = ['scheduled', 'postponed', 'in_progress', 'pending_validation'];

function formatDateTime(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function MatchRow({
  tournamentId,
  match,
  homeRoster,
  awayRoster,
}: {
  tournamentId: string;
  match: ManageMatch;
  homeRoster: RosterPlayer[];
  awayRoster: RosterPlayer[];
}) {
  const router = useRouter();
  const [home, setHome] = useState(String(match.homeScore ?? ''));
  const [away, setAway] = useState(String(match.awayScore ?? ''));
  const [showEvents, setShowEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      router.refresh();
    });
  }

  const recordable = RECORDABLE.includes(match.status);
  const eventEditor = match._count?.events > 0 || showEvents;

  return (
    <li className="match-row">
      <div className="match-info">
        <strong>
          {match.homeTeam.team.name} <span className="vs">vs</span> {match.awayTeam.team.name}
        </strong>
        <p className="entry-meta">
          {match.phase?.name ?? 'Sin fase'}
          {match.matchday ? ` · ${match.matchday.name}` : ''} · {formatDateTime(match.scheduledAt)}
        </p>
        {error ? <p className="d-follow-err">{error}</p> : null}
      </div>
      <div className="match-result">
        {match.status === 'finished' || match.status === 'pending_validation' ? (
          <span className="score-badge">
            {match.homeScore ?? 0} – {match.awayScore ?? 0}
          </span>
        ) : null}
        <span className={`status-pill match-${match.status}`}>
          {MATCH_STATUS_LABELS[match.status] ?? match.status}
        </span>
      </div>
      <div className="match-actions">
        {recordable ? (
          <>
            <input
              className="score-input"
              type="number"
              min={0}
              max={99}
              value={home}
              onChange={(event) => setHome(event.target.value)}
              aria-label="Goles local"
            />
            <input
              className="score-input"
              type="number"
              min={0}
              max={99}
              value={away}
              onChange={(event) => setAway(event.target.value)}
              aria-label="Goles visitante"
            />
            <button
              className="btn-sm btn-approve"
              disabled={pending || home === '' || away === ''}
              onClick={() =>
                run(() =>
                  recordResultAction(tournamentId, match.id, {
                    homeScore: Number(home),
                    awayScore: Number(away),
                  }),
                )
              }
            >
              Registrar
            </button>
          </>
        ) : null}
        {match.status === 'pending_validation' ? (
          <button
            className="btn-sm btn-approve"
            disabled={pending}
            onClick={() => run(() => validateResultAction(tournamentId, match.id))}
          >
            Validar
          </button>
        ) : null}
        {match.status === 'pending_validation' || match.status === 'finished' ? (
          <button
            className="btn-sm btn-ghost"
            disabled={pending}
            onClick={() => run(() => clearResultAction(tournamentId, match.id))}
          >
            Limpiar
          </button>
        ) : null}
        <button
          className="btn-sm btn-ghost"
          disabled={pending}
          onClick={() => setShowEvents((value) => !value)}
        >
          {showEvents ? 'Ocultar eventos' : `Eventos (${match._count?.events ?? 0})`}
        </button>
      </div>
      {eventEditor ? (
        <div className="match-events">
          <MatchEventEditor
            tournamentId={tournamentId}
            matchId={match.id}
            homeRoster={homeRoster}
            awayRoster={awayRoster}
          />
        </div>
      ) : null}
    </li>
  );
}

export function MatchManager({
  tournamentId,
  matches,
  phases,
  matchdaysByPhase,
  approvedEntries,
  rostersByTeam,
}: {
  tournamentId: string;
  matches: ManageMatch[];
  phases: Phase[];
  matchdaysByPhase: Record<string, Matchday[]>;
  approvedEntries: TournamentEntry[];
  rostersByTeam: Record<string, RosterPlayer[]>;
}) {
  const router = useRouter();
  const [phaseId, setPhaseId] = useState(phases[0]?.id ?? '');
  const [matchdayId, setMatchdayId] = useState('');
  const [homeId, setHomeId] = useState('');
  const [awayId, setAwayId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const matchdays = phaseId ? (matchdaysByPhase[phaseId] ?? []) : [];
  const pendingResults = matches.filter((match) => match.status === 'pending_validation').length;

  function submit() {
    setError(null);
    if (!phaseId) {
      setError('Selecciona una fase.');
      return;
    }
    if (!homeId || !awayId) {
      setError('Selecciona ambos equipos.');
      return;
    }
    if (homeId === awayId) {
      setError('Los equipos de un partido no pueden ser el mismo.');
      return;
    }
    startTransition(async () => {
      const result = await createMatchAction(tournamentId, {
        phaseId,
        matchdayId: matchdayId || undefined,
        homeTournamentTeamId: homeId,
        awayTournamentTeamId: awayId,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      setHomeId('');
      setAwayId('');
      setScheduledAt('');
      router.refresh();
    });
  }

  return (
    <div className="d-block">
      <div className="section-heading">
        <h3>Partidos y resultados</h3>
        <span className="result-count">{matches.length}</span>
      </div>
      {pendingResults > 0 ? (
        <p className="panel-note">
          {pendingResults} {pendingResults === 1 ? 'resultado pendiente de validación' : 'resultados pendientes de validación'}.
        </p>
      ) : null}

      {phases.length === 0 ? (
        <p className="empty">Crea una fase y al menos 2 inscripciones aprobadas para programar partidos.</p>
      ) : approvedEntries.length < 2 ? (
        <p className="empty">Necesitas al menos 2 inscripciones aprobadas para programar un partido.</p>
      ) : (
        <div className="inline-form match-create">
          <select
            className="field-input field-select"
            value={phaseId}
            onChange={(event) => {
              setPhaseId(event.target.value);
              setMatchdayId('');
            }}
          >
            {phases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>
          <select
            className="field-input field-select"
            value={matchdayId}
            onChange={(event) => setMatchdayId(event.target.value)}
          >
            <option value="">Sin jornada</option>
            {matchdays.map((matchday) => (
              <option key={matchday.id} value={matchday.id}>
                {matchday.name}
              </option>
            ))}
          </select>
          <select
            className="field-input field-select"
            value={homeId}
            onChange={(event) => setHomeId(event.target.value)}
          >
            <option value="">Local…</option>
            {approvedEntries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.team.name}
              </option>
            ))}
          </select>
          <select
            className="field-input field-select"
            value={awayId}
            onChange={(event) => setAwayId(event.target.value)}
          >
            <option value="">Visitante…</option>
            {approvedEntries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.team.name}
              </option>
            ))}
          </select>
          <input
            className="field-input"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
          <button className="btn-sm btn-approve" disabled={pending} onClick={submit}>
            {pending ? '…' : 'Programar partido'}
          </button>
          {error ? <p className="d-follow-err">{error}</p> : null}
        </div>
      )}

      {matches.length === 0 ? (
        <p className="empty">Todavía no hay partidos programados.</p>
      ) : (
        <ul className="match-list">
          {matches.map((match) => (
            <MatchRow
              key={match.id}
              tournamentId={tournamentId}
              match={match}
              homeRoster={rostersByTeam[match.homeTeam.id] ?? []}
              awayRoster={rostersByTeam[match.awayTeam.id] ?? []}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
