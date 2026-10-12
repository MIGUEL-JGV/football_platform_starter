import type { FootballFormat, TournamentStatus } from '@football/shared-types';

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: 'Borrador',
  registration: 'Inscripciones abiertas',
  upcoming: 'Próximamente',
  in_progress: 'En curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

const FORMAT_LABELS: Record<FootballFormat, string> = {
  football_11: 'Fútbol 11',
  football_7: 'Fútbol 7',
  football_5: 'Fútbol 5',
};

export const formatStatus = (status: TournamentStatus): string =>
  STATUS_LABELS[status] ?? status;

export const formatFootball = (format: FootballFormat): string =>
  FORMAT_LABELS[format] ?? format;

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) {
    return 'Fechas por confirmar';
  }
  const fmt = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const from = start ? fmt.format(new Date(start)) : null;
  const to = end ? fmt.format(new Date(end)) : null;
  if (from && to) {
    return `${from} – ${to}`;
  }
  return from ?? `Hasta ${to}`;
}

export const EVENT_LABELS: Record<string, string> = {
  goal: 'Gol',
  own_goal: 'Autogol',
  penalty_goal: 'Gol de penal',
  penalty_missed: 'Penal fallado',
  penalty_conceded: 'Penal concedido',
  penalty_saved: 'Penal atajado',
  yellow_card: 'Tarjeta amarilla',
  second_yellow: 'Segunda amarilla',
  red_card: 'Tarjeta roja',
  substitution: 'Cambio',
  assist: 'Asistencia',
  foul: 'Falta',
  save: 'Atajada',
};

export const GOAL_EVENTS = new Set(['goal', 'penalty_goal', 'own_goal']);
export const CARD_EVENTS = new Set(['yellow_card', 'second_yellow', 'red_card']);

export const formatEvent = (eventType: string): string => EVENT_LABELS[eventType] ?? eventType;

export function formatMatchDateTime(value: string | null): string {
  if (!value) return 'Por definir';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Por definir';
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}