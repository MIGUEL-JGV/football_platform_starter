'use client';

import { useEffect, useState, useTransition } from 'react';
import { formatEvent } from '../lib/format';
import {
  createMatchEventAction,
  deleteMatchEventAction,
  listMatchEventsAction,
  updateMatchEventAction,
} from '../lib/manage-actions';
import type {
  ManagedMatchEvent,
  MatchEventPeriod,
  MatchEventType,
  RosterPlayer,
} from '../lib/manage';

const EVENT_TYPES: MatchEventType[] = [
  'goal',
  'own_goal',
  'penalty_goal',
  'penalty_missed',
  'penalty_conceded',
  'penalty_saved',
  'yellow_card',
  'second_yellow',
  'red_card',
  'substitution',
  'assist',
  'foul',
  'save',
];

const PERIODS: MatchEventPeriod[] = [
  'regular',
  'first_half',
  'second_half',
  'extra_time',
  'penalties',
];

interface RosterGroup {
  id: string;
  name: string;
  players: RosterPlayer[];
}

export function MatchEventEditor({
  tournamentId,
  matchId,
  homeRoster,
  awayRoster,
}: {
  tournamentId: string;
  matchId: string;
  homeRoster: RosterPlayer[];
  awayRoster: RosterPlayer[];
}) {
  const [events, setEvents] = useState<ManagedMatchEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [type, setType] = useState<MatchEventType>('goal');
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState<MatchEventPeriod>('regular');
  const [side, setSide] = useState('home');
  const [playerId, setPlayerId] = useState('');
  const [secondarySide, setSecondarySide] = useState('away');
  const [secondaryId, setSecondaryId] = useState('');

  const groups: RosterGroup[] = [
    { id: 'home', name: 'Local', players: homeRoster },
    { id: 'away', name: 'Visitante', players: awayRoster },
  ];
  const current = groups.find((group) => group.id === side)?.players ?? [];
  const secondaries = groups.find((group) => group.id === secondarySide)?.players ?? [];

  function reload() {
    setLoaded(false);
    startTransition(async () => {
      const result = await listMatchEventsAction(tournamentId, matchId);
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        setEvents([]);
        setLoaded(true);
        return;
      }
      setEvents(result.events ?? []);
      setError(null);
      setLoaded(true);
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  function add() {
    setError(null);
    if (!playerId) {
      setError('Selecciona a un jugador.');
      return;
    }
    const needsSecondary = type === 'substitution' || type === 'assist';
    if (needsSecondary && !secondaryId) {
      setError('Selecciona al jugador secundario.');
      return;
    }
    startTransition(async () => {
      const result = await createMatchEventAction(tournamentId, matchId, {
        eventType: type,
        minute: minute === '' ? undefined : Number(minute),
        period,
        teamRosterId: playerId,
        ...(needsSecondary && secondaryId ? { secondaryTeamRosterId: secondaryId } : {}),
      });
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      setPlayerId('');
      setSecondaryId('');
      setMinute('');
      reload();
    });
  }

  function remove(eventId: string) {
    startTransition(async () => {
      const result = await deleteMatchEventAction(tournamentId, matchId, eventId);
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      reload();
    });
  }

  function toggleVoid(event: ManagedMatchEvent) {
    startTransition(async () => {
      const result = await updateMatchEventAction(tournamentId, matchId, event.id, {
        status: event.status === 'voided' ? 'valid' : 'voided',
      });
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      reload();
    });
  }

  const needsSecondary = type === 'substitution' || type === 'assist';

  return (
    <div className="events-panel">
      {error ? <p className="d-follow-err">{error}</p> : null}
      <div className="events-form">
        <select
          className="field-input field-select"
          value={type}
          onChange={(event) => {
            setType(event.target.value as MatchEventType);
            setPlayerId('');
            setSecondaryId('');
          }}
        >
          {EVENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {formatEvent(value)}
            </option>
          ))}
        </select>
        <select
          className="field-input field-select"
          value={side}
          onChange={(event) => {
            setSide(event.target.value);
            setPlayerId('');
          }}
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <select
          className="field-input field-select"
          value={playerId}
          onChange={(event) => setPlayerId(event.target.value)}
        >
          <option value="">Jugador…</option>
          {current.map((row) => (
            <option key={row.id} value={row.id}>
              {row.jerseyNumber != null ? `${row.jerseyNumber} · ` : ''}
              {row.player.displayName}
            </option>
          ))}
        </select>
        {needsSecondary ? (
          <>
            <select
              className="field-input field-select"
              value={secondarySide}
              onChange={(event) => {
                setSecondarySide(event.target.value);
                setSecondaryId('');
              }}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <select
              className="field-input field-select"
              value={secondaryId}
              onChange={(event) => setSecondaryId(event.target.value)}
            >
              <option value="">Jugador secundario…</option>
              {secondaries.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.jerseyNumber != null ? `${row.jerseyNumber} · ` : ''}
                  {row.player.displayName}
                </option>
              ))}
            </select>
          </>
        ) : null}
        <input
          className="field-input event-minute"
          type="number"
          min={0}
          max={130}
          placeholder="Min"
          value={minute}
          onChange={(event) => setMinute(event.target.value)}
        />
        <select
          className="field-input field-select"
          value={period}
          onChange={(event) => setPeriod(event.target.value as MatchEventPeriod)}
        >
          {PERIODS.map((value) => (
            <option key={value} value={value}>
              {value.replace('_', ' ')}
            </option>
          ))}
        </select>
        <button className="btn-sm btn-approve" disabled={pending} onClick={add}>
          {pending ? '…' : 'Agregar evento'}
        </button>
      </div>

      {!loaded ? (
        <p className="empty">Cargando eventos…</p>
      ) : events.length === 0 ? (
        <p className="empty">Todavía no hay eventos de este partido.</p>
      ) : (
        <ul className="event-list">
          {events.map((event) => (
            <li key={event.id} className={`event-row${event.status === 'voided' ? ' event-voided' : ''}`}>
              <span className="event-type">{formatEvent(event.eventType)}</span>
              {event.minute != null ? <span className="event-minute-badge">{event.minute}&#39;</span> : null}
              <span className="event-who">
                {event.jerseyNumber != null ? `${event.jerseyNumber} · ` : ''}
                {event.player?.displayName ?? 'Sin jugador'}
                {event.secondaryPlayer ? ` (${event.secondaryJerseyNumber != null ? `${event.secondaryJerseyNumber} · ` : ''}${event.secondaryPlayer.displayName})` : ''}
              </span>
              <div className="event-actions">
                <button
                  className="btn-sm btn-ghost"
                  disabled={pending}
                  onClick={() => toggleVoid(event)}
                >
                  {event.status === 'voided' ? 'Restaurar' : 'Anular'}
                </button>
                <button
                  className="btn-sm btn-reject"
                  disabled={pending}
                  onClick={() => remove(event.id)}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}