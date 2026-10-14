'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTournamentAction } from '../lib/manage-actions';

const FORMAT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'football_11', label: 'Fútbol 11' },
  { value: 'football_7', label: 'Fútbol 7' },
  { value: 'football_5', label: 'Fútbol 5' },
];

export function CreateTournamentForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [format, setFormat] = useState('football_11');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [maxTeams, setMaxTeams] = useState('16');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createTournamentAction({
        name: name.trim(),
        format,
        categoryLabel: categoryLabel.trim() || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        maxTeams: maxTeams ? Number(maxTeams) : undefined,
        minAge: minAge ? Number(minAge) : undefined,
        maxAge: maxAge ? Number(maxAge) : undefined,
      });
      if (!result.ok || !result.id) {
        setError(result.error === 'auth' ? 'Tu sesión expiró.' : (result.error ?? 'Error'));
        return;
      }
      router.push(`/panel/tournaments/${result.id}`);
    });
  }

  return (
    <div className="d-block">
      <div className="create-form">
        <label className="create-field">
          <span>Nombre del torneo</span>
          <input
            className="field-input"
            placeholder="Ej. Liga Metropolitana 2026"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="create-grid">
          <label className="create-field">
            <span>Formato</span>
            <select
              className="field-input field-select"
              value={format}
              onChange={(event) => setFormat(event.target.value)}
            >
              {FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="create-field">
            <span>Categoría</span>
            <input
              className="field-input"
              placeholder="Ej. Libre, Sub-17"
              value={categoryLabel}
              onChange={(event) => setCategoryLabel(event.target.value)}
            />
          </label>

          <label className="create-field">
            <span>Sede / ubicación</span>
            <input
              className="field-input"
              placeholder="Ej. Ciudad de México"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </label>

          <label className="create-field">
            <span>Cupo de equipos</span>
            <input
              className="field-input"
              inputMode="numeric"
              placeholder="16"
              value={maxTeams}
              onChange={(event) => setMaxTeams(event.target.value.replace(/\D/g, ''))}
            />
          </label>

          <label className="create-field">
            <span>Edad mínima</span>
            <input
              className="field-input"
              inputMode="numeric"
              placeholder="16"
              value={minAge}
              onChange={(event) => setMinAge(event.target.value.replace(/\D/g, ''))}
            />
          </label>

          <label className="create-field">
            <span>Edad máxima</span>
            <input
              className="field-input"
              inputMode="numeric"
              placeholder="40"
              value={maxAge}
              onChange={(event) => setMaxAge(event.target.value.replace(/\D/g, ''))}
            />
          </label>
        </div>

        <label className="create-field">
          <span>Descripción</span>
          <textarea
            className="field-input create-textarea"
            placeholder="Reglas, premiación, horarios…"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {error ? <p className="d-follow-err">{error}</p> : null}

        <div className="create-actions">
          <button
            className="btn-sm btn-approve"
            disabled={pending || name.trim().length < 2}
            onClick={submit}
          >
            {pending ? 'Creando…' : 'Crear torneo'}
          </button>
        </div>
      </div>
    </div>
  );
}
