'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { AUTHORIZE_COOKIE, getAuthorizationToken, getToken } from './auth';
import {
  applyEntry,
  approveEntry,
  clearMatchResult,
  createAuthorization,
  createInvitation,
  createMatch,
  createMatchday,
  createMatchEvent,
  createNews,
  createPhase,
  createTournament,
  deleteMatchEvent,
  deleteNews,
  deletePlayerPhoto,
  listMatchEvents,
  publishNews,
  recordMatchResult,
  regenerateInvitation,
  rejectEntry,
  revokeAuthorization,
  revokeInvitation,
  setPrimaryPlayerPhoto,
  unpublishNews,
  updateMatchEvent,
  updateNews,
  updateTournamentStatus,
  uploadPlayerPhoto,
  validateMatchResult,
  withdrawEntry,
  type AppliedEntry,
  type CreateTournamentInput,
  type CreatedAuthorization,
  type CreatedInvitation,
  type ManagedMatchEvent,
  type ManageNewsPost,
  type MatchEventInput,
  type NewsStatus,
  type PhaseType,
  type PlayerPhoto,
  type TournamentEntry,
} from './manage';

export interface EntryActionResult {
  ok: boolean;
  error?: string;
  entry?: TournamentEntry;
}

async function runEntryAction(
  tournamentId: string,
  entryId: string,
  action: (
    token: string,
    tournamentId: string,
    entryId: string,
    authorizationToken?: string,
  ) => Promise<TournamentEntry>,
): Promise<EntryActionResult> {
  const token = await getToken();
  if (!token) {
    return { ok: false, error: 'auth' };
  }
  const authorizationToken = (await getAuthorizationToken()) ?? undefined;
  try {
    const entry = await action(token, tournamentId, entryId, authorizationToken);
    revalidatePath(`/panel/tournaments/${tournamentId}`);
    revalidatePath(`/tournaments/${tournamentId}`);
    return { ok: true, entry };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo completar la acción.';
    return { ok: false, error: message };
  }
}

export async function approveEntryAction(
  tournamentId: string,
  entryId: string,
): Promise<EntryActionResult> {
  return runEntryAction(tournamentId, entryId, approveEntry);
}

export async function rejectEntryAction(
  tournamentId: string,
  entryId: string,
  reason?: string,
): Promise<EntryActionResult> {
  return runEntryAction(tournamentId, entryId, (token, tid, eid, authorizationToken) =>
    rejectEntry(token, tid, eid, reason, authorizationToken),
  );
}

export async function withdrawEntryAction(
  tournamentId: string,
  entryId: string,
): Promise<EntryActionResult> {
  const token = await getToken();
  if (!token) {
    return { ok: false, error: 'auth' };
  }
  const authorizationToken = (await getAuthorizationToken()) ?? undefined;
  try {
    await withdrawEntry(token, tournamentId, entryId, authorizationToken);
    revalidatePath(`/panel/tournaments/${tournamentId}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo retirar la inscripción.';
    return { ok: false, error: message };
  }
}

export interface SimpleResult {
  ok: boolean;
  error?: string;
}

function revalidateSchedule(tournamentId: string) {
  revalidatePath(`/panel/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}`);
}

export async function createPhaseAction(
  tournamentId: string,
  dto: { name: string; phaseType: PhaseType },
): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await createPhase(token, tournamentId, dto);
    revalidateSchedule(tournamentId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo crear la fase.' };
  }
}

export async function createMatchdayAction(
  tournamentId: string,
  phaseId: string,
  dto: { name: string },
): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await createMatchday(token, tournamentId, phaseId, dto);
    revalidateSchedule(tournamentId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo crear la jornada.',
    };
  }
}

export async function createMatchAction(
  tournamentId: string,
  dto: {
    phaseId: string;
    matchdayId?: string;
    homeTournamentTeamId: string;
    awayTournamentTeamId: string;
    scheduledAt?: string;
  },
): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await createMatch(token, tournamentId, dto);
    revalidateSchedule(tournamentId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo crear el partido.' };
  }
}

export async function recordResultAction(
  tournamentId: string,
  matchId: string,
  dto: { homeScore: number; awayScore: number },
): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await recordMatchResult(token, tournamentId, matchId, dto);
    revalidateSchedule(tournamentId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo registrar el resultado.' };
  }
}

export async function validateResultAction(
  tournamentId: string,
  matchId: string,
): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await validateMatchResult(token, tournamentId, matchId);
    revalidateSchedule(tournamentId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo validar el resultado.' };
  }
}

export async function clearResultAction(
  tournamentId: string,
  matchId: string,
): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await clearMatchResult(token, tournamentId, matchId);
    revalidateSchedule(tournamentId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo limpiar el resultado.' };
  }
}

export interface MatchEventsResult {
  ok: boolean;
  error?: string;
  events?: ManagedMatchEvent[];
}

export async function listMatchEventsAction(
  tournamentId: string,
  matchId: string,
): Promise<MatchEventsResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    const events = await listMatchEvents(token, tournamentId, matchId);
    return { ok: true, events };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudieron cargar los eventos.',
    };
  }
}

export async function createMatchEventAction(
  tournamentId: string,
  matchId: string,
  dto: MatchEventInput,
): Promise<MatchEventsResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await createMatchEvent(token, tournamentId, matchId, dto);
    revalidateSchedule(tournamentId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo registrar el evento.',
    };
  }
}

export async function updateMatchEventAction(
  tournamentId: string,
  matchId: string,
  eventId: string,
  dto: MatchEventInput,
): Promise<MatchEventsResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await updateMatchEvent(token, tournamentId, matchId, eventId, dto);
    revalidateSchedule(tournamentId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo modificar el evento.',
    };
  }
}

export async function deleteMatchEventAction(
  tournamentId: string,
  matchId: string,
  eventId: string,
): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await deleteMatchEvent(token, tournamentId, matchId, eventId);
    revalidateSchedule(tournamentId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo eliminar el evento.',
    };
  }
}

export interface NewsActionResult {
  ok: boolean;
  error?: string;
  post?: ManageNewsPost;
}

function revalidateNews(tournamentId: string) {
  revalidateSchedule(tournamentId);
  revalidatePath(`/tournaments/${tournamentId}/news`);
}

export async function createNewsAction(
  tournamentId: string,
  dto: { title: string; body: string; status?: NewsStatus },
): Promise<NewsActionResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    const post = await createNews(token, tournamentId, dto);
    revalidateNews(tournamentId);
    return { ok: true, post };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo crear la noticia.',
    };
  }
}

export async function updateNewsAction(
  tournamentId: string,
  postId: string,
  dto: { title?: string; body?: string; status?: NewsStatus },
): Promise<NewsActionResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    const post = await updateNews(token, tournamentId, postId, dto);
    revalidateNews(tournamentId);
    return { ok: true, post };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo guardar la noticia.',
    };
  }
}

export async function deleteNewsAction(tournamentId: string, postId: string): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await deleteNews(token, tournamentId, postId);
    revalidateNews(tournamentId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo eliminar la noticia.',
    };
  }
}

export async function publishNewsAction(tournamentId: string, postId: string): Promise<NewsActionResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    const post = await publishNews(token, tournamentId, postId);
    revalidateNews(tournamentId);
    return { ok: true, post };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo publicar la noticia.',
    };
  }
}

export async function unpublishNewsAction(tournamentId: string, postId: string): Promise<NewsActionResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    const post = await unpublishNews(token, tournamentId, postId);
    revalidateNews(tournamentId);
    return { ok: true, post };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo despublicar la noticia.',
    };
  }
}

export interface ApplyEntryResult {
  ok: boolean;
  error?: string;
  entry?: AppliedEntry;
}

export async function applyEntryAction(
  tournamentId: string,
  dto: {
    teamId: string;
    invitationToken?: string;
    representativeName?: string;
    representativePhone?: string;
    representativeEmail?: string;
    players?: import('./manage').ApplyPlayerInput[];
  },
): Promise<ApplyEntryResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  const authorizationToken = (await getAuthorizationToken()) ?? undefined;
  try {
    const entry = await applyEntry(token, tournamentId, dto, authorizationToken);
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath('/panel');
    return { ok: true, entry };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo enviar la inscripción.',
    };
  }
}

export interface CreateTournamentResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createTournamentAction(
  dto: CreateTournamentInput,
): Promise<CreateTournamentResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    const tournament = await createTournament(token, dto);
    revalidatePath('/panel');
    revalidatePath('/mis-torneos');
    return { ok: true, id: tournament.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo crear el torneo.',
    };
  }
}

export interface InvitationActionResult {
  ok: boolean;
  error?: string;
  invitation?: CreatedInvitation;
}

export async function createInvitationAction(
  tournamentId: string,
  dto: { label?: string; maxUses?: number; expiresInDays?: number },
): Promise<InvitationActionResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    const invitation = await createInvitation(token, tournamentId, dto);
    revalidatePath(`/panel/tournaments/${tournamentId}`);
    return { ok: true, invitation };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo crear la invitación.',
    };
  }
}

export async function regenerateInvitationAction(
  tournamentId: string,
  invitationId: string,
): Promise<InvitationActionResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    const invitation = await regenerateInvitation(token, tournamentId, invitationId);
    revalidatePath(`/panel/tournaments/${tournamentId}`);
    return { ok: true, invitation };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo regenerar la invitación.',
    };
  }
}

export async function revokeInvitationAction(
  tournamentId: string,
  invitationId: string,
): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await revokeInvitation(token, tournamentId, invitationId);
    revalidatePath(`/panel/tournaments/${tournamentId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo revocar la invitación.',
    };
  }
}

export interface PhotoActionResult {
  ok: boolean;
  error?: string;
  photo?: PlayerPhoto;
}

export async function uploadPhotoAction(
  playerId: string,
  formData: FormData,
): Promise<PhotoActionResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Selecciona una imagen para subir.' };
  }
  const makePublic = formData.get('makePublic') === 'true';
  try {
    const photo = await uploadPlayerPhoto(token, playerId, file, makePublic);
    revalidatePath(`/players/${playerId}`);
    return { ok: true, photo };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo subir la fotografía.',
    };
  }
}

export async function setPrimaryPhotoAction(
  playerId: string,
  photoId: string,
): Promise<PhotoActionResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    const photo = await setPrimaryPlayerPhoto(token, playerId, photoId);
    revalidatePath(`/players/${playerId}`);
    return { ok: true, photo };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo actualizar la portada.',
    };
  }
}

export async function deletePhotoAction(playerId: string, photoId: string): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await deletePlayerPhoto(token, playerId, photoId);
    revalidatePath(`/players/${playerId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo eliminar la fotografía.',
    };
  }
}

export interface StatusActionResult {
  ok: boolean;
  error?: string;
  status?: string;
}

export async function updateTournamentStatusAction(
  organizationId: string,
  tournamentId: string,
  status: string,
): Promise<StatusActionResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    const tournament = await updateTournamentStatus(token, organizationId, tournamentId, status);
    revalidateSchedule(tournamentId);
    revalidatePath('/panel');
    return { ok: true, status: tournament.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo actualizar el estado del torneo.',
    };
  }
}

export interface AuthorizationActionResult {
  ok: boolean;
  error?: string;
  authorization?: CreatedAuthorization;
}

export async function createAuthorizationAction(
  tournamentId: string,
  dto: { label?: string; maxUses?: number; expiresInDays?: number },
): Promise<AuthorizationActionResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    const authorization = await createAuthorization(token, tournamentId, dto);
    revalidatePath(`/panel/tournaments/${tournamentId}`);
    return { ok: true, authorization };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo crear el enlace de autorización.',
    };
  }
}

export async function revokeAuthorizationAction(
  tournamentId: string,
  authorizationId: string,
): Promise<SimpleResult> {
  const token = await getToken();
  if (!token) return { ok: false, error: 'auth' };
  try {
    await revokeAuthorization(token, tournamentId, authorizationId);
    revalidatePath(`/panel/tournaments/${tournamentId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo revocar el enlace de autorización.',
    };
  }
}

export async function activateAuthorizationAction(authorizeToken: string): Promise<SimpleResult> {
  const store = await cookies();
  store.set(AUTHORIZE_COOKIE, authorizeToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return { ok: true };
}

export async function clearAuthorizationAction(): Promise<SimpleResult> {
  const store = await cookies();
  store.delete(AUTHORIZE_COOKIE);
  return { ok: true };
}
