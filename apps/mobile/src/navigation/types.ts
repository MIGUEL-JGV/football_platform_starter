export type RootStackParamList = {
  Tabs: undefined;
  TournamentDetail: { tournamentId: string; name?: string };
  MatchDetail: { tournamentId: string; matchId: string; name?: string };
  TeamProfile: { teamId: string; name?: string };
  PlayerProfile: { playerId: string; name?: string };
  Login: undefined;
  Register: undefined;
  CreateTournament: undefined;
  ApplyEntry: { tournamentId: string; tournamentName: string; requiresInvitation: boolean };
};

export type TabParamList = {
  Home: undefined;
  MyTournaments: undefined;
  Account: undefined;
};
