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