import { TournamentStatus, FootballFormat } from '@football/shared-types';

export const colors = {
  bg: '#f5f7f3',
  card: '#ffffff',
  border: '#dfe6dd',
  ink: '#14241d',
  muted: '#65736b',
  green: '#50782d',
  greenDarkText: '#0f2a1d',
  brandPlus: '#557c2c',
  art: '#254b34',
  footer: '#193b2b',
  pillBg: '#eef2ea',
  white: '#ffffff',
  danger: '#c0392b',
  overlay: '#ffffffdd',
};

export const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: 'Borrador',
  registration: 'Inscripciones abiertas',
  upcoming: 'Próximamente',
  in_progress: 'En curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

export const FORMAT_LABELS: Record<FootballFormat, string> = {
  football_11: 'Fútbol 11',
  football_7: 'Fútbol 7',
  football_5: 'Fútbol 5',
};

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
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

export const formatEvent = (eventType: string): string => EVENT_LABELS[eventType] ?? eventType;

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Por definir';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Por definir';
  return date.toLocaleString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}