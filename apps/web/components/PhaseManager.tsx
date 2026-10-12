'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createMatchdayAction, createPhaseAction } from '../lib/manage-actions';
import {
  PHASE_TYPE_LABELS,
  type Matchday,
  type Phase,
  type PhaseType,
} from '../lib/manage';

function MatchdayForm({ tournamentId, phaseId }: { tournamentId: string; phaseId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createMatchdayAction(tournamentId, phaseId, { name: name.trim() });
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      setName('');
      router.refresh();
    });
  }

  return (
    <div className="inline-form">
      <input
        className="field-input"
        placeholder="Nueva jornada (ej. Jornada 1)"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button
        className="btn-sm btn-ghost"
        disabled={pending || name.trim().length < 2}
        onClick={submit}
      >
        {pending ? '…' : 'Añadir jornada'}
      </button>
      {error ? <p className="d-follow-err">{error}</p> : null}
    </div>
  );
}

export function PhaseManager({
  tournamentId,
  phases,
  matchdaysByPhase,
}: {
  tournamentId: string;
  phases: Phase[];
  matchdaysByPhase: Record<string, Matchday[]>;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phaseType, setPhaseType] = useState<PhaseType>('league');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createPhaseAction(tournamentId, { name: name.trim(), phaseType });
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      setName('');
      router.refresh();
    });
  }

  return (
    <div className="d-block">
      <div className="section-heading">
        <h3>Fases y jornadas</h3>
        <span className="result-count">{phases.length}</span>
      </div>

      <div className="inline-form">
        <input
          className="field-input"
          placeholder="Nombre de la fase (ej. Fase regular)"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <select
          className="field-input field-select"
          value={phaseType}
          onChange={(event) => setPhaseType(event.target.value as PhaseType)}
        >
          {Object.entries(PHASE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          className="btn-sm btn-approve"
          disabled={pending || name.trim().length < 2}
          onClick={submit}
        >
          {pending ? '…' : 'Crear fase'}
        </button>
        {error ? <p className="d-follow-err">{error}</p> : null}
      </div>

      {phases.length === 0 ? (
        <p className="empty">Todavía no hay fases. Crea una para poder programar partidos.</p>
      ) : (
        <ul className="phase-list">
          {phases.map((phase) => (
            <li className="phase-item" key={phase.id}>
              <div className="phase-head">
                <strong>{phase.name}</strong>
                <span className="role-tag">{PHASE_TYPE_LABELS[phase.phaseType] ?? phase.phaseType}</span>
                <span className="entry-meta">
                  {phase._count.matchdays} jornadas · {phase._count.matches} partidos
                </span>
              </div>
              <div className="chip-row">
                {(matchdaysByPhase[phase.id] ?? []).map((matchday) => (
                  <span className="chip" key={matchday.id}>
                    {matchday.name} · {matchday._count.matches}
                  </span>
                ))}
                {(matchdaysByPhase[phase.id] ?? []).length === 0 ? (
                  <span className="entry-meta">Sin jornadas</span>
                ) : null}
              </div>
              <MatchdayForm tournamentId={tournamentId} phaseId={phase.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
