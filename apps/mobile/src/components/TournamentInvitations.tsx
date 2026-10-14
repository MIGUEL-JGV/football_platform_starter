import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { ErrorBanner, PrimaryButton, TextField } from './ui';
import { useAuth } from '../auth/AuthContext';
import {
  createInvitation,
  CreatedInvitation,
  listInvitations,
  regenerateInvitation,
  revokeInvitation,
  TournamentInvitation,
} from '../api/tournaments';
import { colors } from '../theme';

const STATUS_LABELS: Record<TournamentInvitation['status'], string> = {
  active: 'Activa',
  revoked: 'Revocada',
  exhausted: 'Agotada',
};

function toPositiveInt(value: string): number | undefined {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function TournamentInvitations({ tournamentId }: { tournamentId: string }) {
  const { token } = useAuth();
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<CreatedInvitation | null>(null);
  const [invitations, setInvitations] = useState<TournamentInvitation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setInvitations(await listInvitations(token, tournamentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las invitaciones.');
    } finally {
      setLoading(false);
    }
  }, [token, tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createInvitation(token, tournamentId, {
        label: label.trim() || undefined,
        maxUses: toPositiveInt(maxUses),
        expiresInDays: toPositiveInt(expiresInDays),
      });
      setSecret(result);
      setLabel('');
      setMaxUses('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la invitación.');
    } finally {
      setCreating(false);
    }
  };

  const regenerate = async (invitationId: string) => {
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      const result = await regenerateInvitation(token, tournamentId, invitationId);
      setSecret(result);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo regenerar la invitación.');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (invitationId: string) => {
    if (!token) return;
    setError(null);
    try {
      await revokeInvitation(token, tournamentId, invitationId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo revocar la invitación.');
    }
  };

  const share = async (joinUrl: string) => {
    try {
      await Share.share({ message: joinUrl });
    } catch {
      setError('No se pudo compartir el enlace.');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Invitaciones de equipo</Text>
      <Text style={styles.cardSub}>
        Genera un enlace o QR para que los equipos se inscriban a este torneo.
      </Text>

      {error ? <ErrorBanner message={error} /> : null}

      <TextField
        label="Etiqueta (opcional)"
        placeholder="Ej. Liga 2026"
        value={label}
        onChangeText={setLabel}
      />
      <TextField
        label="Usos máximos (opcional)"
        placeholder="Sin límite"
        keyboardType="number-pad"
        value={maxUses}
        onChangeText={setMaxUses}
      />
      <TextField
        label="Días de vigencia (opcional)"
        placeholder="Sin caducidad"
        keyboardType="number-pad"
        value={expiresInDays}
        onChangeText={setExpiresInDays}
      />
      <PrimaryButton title="Generar invitación" loading={creating} onPress={create} />

      {secret ? (
        <View style={styles.secretCard}>
          <Text style={styles.secretTitle}>Enlace generado</Text>
          <Text style={styles.secretNote}>
            Cópialo ahora: el token completo solo se muestra una vez.
          </Text>
          <Text selectable style={styles.link}>
            {secret.joinUrl}
          </Text>
          <Image source={{ uri: secret.qrDataUrl }} style={styles.qr} resizeMode="contain" />
          <PrimaryButton title="Compartir enlace" onPress={() => share(secret.joinUrl)} />
        </View>
      ) : null}

      <Text style={styles.listTitle}>
        Enlaces {loading ? '(cargando…)' : `(${invitations.length})`}
      </Text>
      {invitations.length === 0 ? (
        <Text style={styles.note}>Aún no hay invitaciones.</Text>
      ) : (
        invitations.map((invitation) => (
          <View key={invitation.id} style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>{invitation.label || 'Sin etiqueta'}</Text>
              <Text style={styles.rowMeta}>
                {STATUS_LABELS[invitation.status]} · {invitation.usedCount}
                {invitation.maxUses ? `/${invitation.maxUses}` : ''} usos ·{' '}
                {invitation.entriesCount} inscritos
                {invitation.expiresAt ? ` · vence ${invitation.expiresAt.slice(0, 10)}` : ''}
              </Text>
            </View>
            <View style={styles.rowActions}>
              <Pressable onPress={() => regenerate(invitation.id)} style={styles.ghostButton}>
                <Text style={styles.ghostText}>Regenerar</Text>
              </Pressable>
              {invitation.status !== 'revoked' ? (
                <Pressable onPress={() => revoke(invitation.id)} style={styles.revokeButton}>
                  <Text style={styles.revokeText}>Revocar</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: colors.ink },
  cardSub: { color: colors.muted, fontSize: 12.5, marginTop: 4, marginBottom: 14, lineHeight: 18 },
  secretCard: {
    marginTop: 16,
    backgroundColor: colors.pillBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  secretTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
  secretNote: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  link: { color: colors.green, fontWeight: '700', fontSize: 13 },
  qr: { width: 180, height: 180, alignSelf: 'center', backgroundColor: colors.white },
  listTitle: { fontSize: 14, fontWeight: '900', color: colors.ink, marginTop: 18, marginBottom: 8 },
  note: { color: colors.muted, paddingVertical: 6 },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
    gap: 8,
  },
  rowInfo: { minWidth: 0 },
  rowLabel: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 8 },
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ghostText: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  revokeButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  revokeText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
});
