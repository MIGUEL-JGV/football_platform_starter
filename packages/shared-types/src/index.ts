export type TournamentVisibility = 'public' | 'private' | 'unlisted';
export type TournamentStatus =
  | 'draft'
  | 'registration'
  | 'upcoming'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type FootballFormat = 'football_11' | 'football_7' | 'football_5';

export interface PublicTournamentCard {
  id: string;
  name: string;
  organizationName: string;
  format: FootballFormat;
  status: TournamentStatus;
  startDate: string | null;
  endDate: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
}

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  errors?: string[];
  requestId?: string;
}
