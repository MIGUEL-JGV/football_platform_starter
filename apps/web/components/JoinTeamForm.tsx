'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { applyEntryAction } from '../lib/manage-actions';
import type { ApplyPlayerInput, MyTeamSummary } from '../lib/manage';

export interface SquadPlayer {
  playerId: string;
  displayName: string;
  age: number | null;
  photoUrl: string | null;
  preferredPosition: string | null;
}

const POSITIONS: Array<{ value: string; label: string }> = [
  { value: 'goalkeeper', label: 'Portero' },
  { value: 'defender', label: 'Defensa' },
  { value: 'midfielder', label: 'Mediocampista' },
  { value: 'forward', label: 'Delantero' },
];

interface SelectedPlayer {
  jerseyNumber: string;
  position: string;
  consentChecked: boolean;
  guardianName: string;
  guardianRelation: string;
}

export function JoinTeamForm({
  tournamentId,
  invitationToken,
  teams,
  squads,
}: {
  tournamentId: string;
  invitationToken: string;
  teams: MyTeamSummary[];
  squads: Record<string, SquadPlayer[]>;
}) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '');
  const [step, setStep] = useState<'team' | 'squad'>('team');
  const [selected, setSelected] = useState<Record<string, SelectedPlayer>>({});
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const squad = squads[teamId] ?? [];

  if (teams.length === 0) {
    return (
      <div className="join-register">
        <p className="join-note">
          No tienes equipos registrados. Crea un equipo para poder inscribirlo en este torneo.
        </p>
        <div className="account-ctas">
          <Link className="light-button" href="/panel">
            Ir a mi panel
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="join-register">
        <p className="join-success">✓ Inscripción enviada. Queda pendiente de aprobación del organizador.</p>
        <div className="account-ctas">
          <Link className="light-button" href="/panel">
            Ir a mi panel
          </Link>
          <Link className="login" href="/mis-torneos">
            Mis torneos
          </Link>
        </div>
      </div>
    );
  }

  function togglePlayer(playerId: string, isMinor: boolean) {
    setSelected((current) => {
      const next = { ...current };
      if (next[playerId]) {
        delete next[playerId];
      } else {
        next[playerId] = {
          jerseyNumber: '',
          position: isMinor ? 'goalkeeper' : '',
          consentChecked: !isMinor,
          guardianName: '',
          guardianRelation: '',
        };
      }
      return next;
    });
  }

  function updatePlayer(
    playerId: string,
    patch: Partial<Omit<SelectedPlayer, 'consentChecked'>> | { consentChecked: boolean },
  ) {
    setSelected((current) => {
      const next = { ...current };
      if (!next[playerId]) {
        return current;
      }
      next[playerId] = { ...next[playerId], ...patch };
      return next;
    });
  }

  function submit() {
    setError(null);
    const players: ApplyPlayerInput[] = [];
    for (const player of squad) {
      const cfg = selected[player.playerId];
      if (!cfg) continue;
      const isMinor = player.age !== null && player.age < 18;
      if (isMinor && (!cfg.consentChecked || !cfg.guardianName.trim())) {
        setError(
          `${player.displayName} es menor de edad: marca el consentimiento y escribe el nombre del tutor.`,
        );
        return;
      }
      players.push({
        playerId: player.playerId,
        jerseyNumber: cfg.jerseyNumber ? Number(cfg.jerseyNumber) : null,
        position: cfg.position || null,
        ...(isMinor
          ? {
              consent: {
                guardianName: cfg.guardianName.trim(),
                guardianRelation: cfg.guardianRelation.trim() || undefined,
              },
            }
          : {}),
      });
    }
    startTransition(async () => {
      const result = await applyEntryAction(tournamentId, {
        teamId,
        invitationToken,
        representativeName: contactName.trim() || undefined,
        representativePhone: contactPhone.trim() || undefined,
        players,
      });
      if (!result.ok) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  if (step === 'team') {
    return (
      <div className="join-register">
        <label className="create-field">
          <span>Equipo a inscribir</span>
          <select
            className="field-input field-select"
            value={teamId}
            onChange={(event) => {
              setTeamId(event.target.value);
              setSelected({});
            }}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        {squad.length === 0 ? (
          <p className="join-hint">El club no tiene jugadores registrados aún; podrás completar la plantilla después.</p>
        ) : (
          <p className="join-hint">
            Pasaremos a armar la plantilla de {squad.length} jugadores del club para la convocatoria.
          </p>
        )}
        {error ? <p className="d-follow-err">{error}</p> : null}
        <div className="join-step-actions">
          <button
            className="btn-sm btn-approve"
            disabled={pending || !teamId}
            onClick={() => setStep('squad')}
          >
            Continuar con la plantilla
          </button>
        </div>
      </div>
    );
  }

  const selectedCount = Object.keys(selected).length;

  return (
    <div className="join-register">
      <div className="join-subheading">
        <button className="join-back" disabled={pending} onClick={() => setStep('team')}>
          ← Cambiar equipo
        </button>
        <span>
          {selectedCount} de {squad.length} jugadores seleccionados
        </span>
      </div>

      <ul className="squad-builder">
        {squad.map((player) => {
          const cfg = selected[player.playerId];
          const isMinor = player.age !== null && player.age < 18;
          return (
            <li key={player.playerId} className={`squad-pick${cfg ? ' squad-pick-on' : ''}`}>
              <label className="squad-pick-main">
                <input
                  className="squad-check"
                  type="checkbox"
                  checked={Boolean(cfg)}
                  onChange={() => togglePlayer(player.playerId, isMinor)}
                />
                <span className="squad-name">{player.displayName}</span>
                {isMinor ? <span className="squad-minor">Menor (requiere consentimiento)</span> : null}
              </label>
              {cfg ? (
                <div className="squad-detail">
                  <label className="squad-field">
                    <span>Dorsal</span>
                    <input
                      className="field-input"
                      type="number"
                      min={1}
                      max={99}
                      value={cfg.jerseyNumber}
                      onChange={(event) => updatePlayer(player.playerId, { jerseyNumber: event.target.value })}
                    />
                  </label>
                  <label className="squad-field">
                    <span>Posición</span>
                    <select
                      className="field-input field-select"
                      value={cfg.position}
                      onChange={(event) => updatePlayer(player.playerId, { position: event.target.value })}
                    >
                      <option value="">—</option>
                      {POSITIONS.map((position) => (
                        <option key={position.value} value={position.value}>
                          {position.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isMinor ? (
                    <div className="squad-consent">
                      <label className="squad-consent-check">
                        <input
                          type="checkbox"
                          checked={cfg.consentChecked}
                          onChange={(event) =>
                            updatePlayer(player.playerId, { consentChecked: event.target.checked })
                          }
                        />
                        <span>Tengo el consentimiento del tutor para que participe.</span>
                      </label>
                      {cfg.consentChecked ? (
                        <div className="squad-consent-fields">
                          <label className="squad-field">
                            <span>Nombre del tutor</span>
                            <input
                              className="field-input"
                              value={cfg.guardianName}
                              onChange={(event) => updatePlayer(player.playerId, { guardianName: event.target.value })}
                            />
                          </label>
                          <label className="squad-field">
                            <span>Parentesco</span>
                            <input
                              className="field-input"
                              placeholder="Ej. madre, padre, tutor"
                              value={cfg.guardianRelation}
                              onChange={(event) => updatePlayer(player.playerId, { guardianRelation: event.target.value })}
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="join-contact">
        <label className="create-field">
          <span>Persona de contacto (representante)</span>
          <input
            className="field-input"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
          />
        </label>
        <label className="create-field">
          <span>Teléfono de contacto</span>
          <input
            className="field-input"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
          />
        </label>
      </div>

      {error ? <p className="d-follow-err">{error}</p> : null}
      <button
        className="btn-sm btn-approve"
        disabled={pending}
        onClick={submit}
      >
        {pending ? 'Enviando…' : 'Enviar inscripción'}
      </button>
    </div>
  );
}