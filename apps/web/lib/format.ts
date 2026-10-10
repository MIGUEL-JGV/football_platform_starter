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