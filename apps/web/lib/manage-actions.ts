'use server';

import { revalidatePath } from 'next/cache';
import { getToken } from './auth';
import {
  approveEntry,
  clearMatchResult,
  createMatch,
  createMatchday,
  createPhase,
  recordMatchResult,
  rejectEntry,
  validateMatchResult,
  withdrawEntry,
  type PhaseType,
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
  action: (token: string, tournamentId: string, entryId: string) => Promise<TournamentEntry>,
): Promise<EntryActionResult> {
  const token = await getToken();
  if (!token) {
    return { ok: false, error: 'auth' };
  }
  try {
    const entry = await action(token, tournamentId, entryId);
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
): Promise<EntryActionResult> {
  return runEntryAction(tournamentId, entryId, rejectEntry);
}

export async function withdrawEntryAction(
  tournamentId: string,
  entryId: string,
): Promise<EntryActionResult> {
  const token = await getToken();
  if (!token) {
    return { ok: false, error: 'auth' };
  }
  try {
    await withdrawEntry(token, tournamentId, entryId);
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
