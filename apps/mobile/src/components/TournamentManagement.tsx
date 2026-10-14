import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import type { TournamentStatus } from '@football/shared-types';
import { ErrorBanner, PrimaryButton, TextField } from './ui';
import { useAuth } from '../auth/AuthContext';
import {
  createAuthorization,
  CreatedAuthorization,
  listAuthorizations,
  revokeAuthorization,
  TournamentAuthorization,
  updateTournamentStatus,
} from '../api/tournaments';
import { colors, STATUS_LABELS } from '../theme';

interface Props {
  tournamentId: string;
  organizationId: string;
  status: TournamentStatus;
  canCreateAuthorization: boolean;
  onChanged: () => void;
}

function toPositiveInt(value: string): number | undefined {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function TournamentManagement({
  tournamentId,
  organizationId,
  status,
  canCreateAuthorization,
  onChanged,
}: Props) {
  const { token, authorizationToken, activateAuthorization } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedAuthorization | null>(null);
  const [authorizations, setAuthorizations] = useState<TournamentAuthorization[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const loadAuthorizations = useCallback(async () => {
    if (!token || !canCreateAuthorization) return;
    setLoadingList(true);
    try {
      setAuthorizations(await listAuthorizations(token, tournamentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las autorizaciones.');
    } finally {
      setLoadingList(false);
    }
  }, [token, canCreateAuthorization, tournamentId]);

  useEffect(() => {
    loadAuthorizations();
  }, [loadAuthorizations]);

  const changeStatus = async (next: TournamentStatus) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await updateTournamentStatus(token, organizationId, tournamentId, next);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.');
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = async () => {
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createAuthorization(token, tournamentId, {
        label: label.trim() || undefined,
        maxUses: toPositiveInt(maxUses),
        expiresInDays: toPositiveInt(expiresInDays),
      });
      setCreated(result);
      setLabel('');
      setMaxUses('');
      setExpiresInDays('');
      await loadAuthorizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el enlace.');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (authorizationId: string) => {
    if (!token) return;
    setError(null);
    try {
      await revokeAuthorization(token, tournamentId, authorizationId);
      await loadAuthorizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo revocar el enlace.');
    }
  };

  const shareLink = async (url: string) => {
    try {
      await Share.share({
        message: `Únete y autoriza cambios en el torneo: ${url}`,
        url,
      });
    } catch {
      setError('No se pudo compartir el enlace.');
    }
  };

  const statusActions: { label: string; variant: 'primary' | 'outline'; next: TournamentStatus }[] =
    status === 'in_progress'
      ? [{ label: 'Finalizar torneo', variant: 'primary', next: 'completed' }]
      : status === 'completed' || status === 'cancelled'
        ? [{ label: 'Reabrir inscripciones', variant: 'outline', next: 'registration' }]
        : [{ label: 'Iniciar torneo', variant: 'primary', next: 'in_progress' }];

  return (
    <View>
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado del torneo</Text>
        <Text style={styles.cardSub}>
          Ahora mismo: {STATUS_LABELS[status]}. Al iniciar el torneo se bloquean las inscripciones.
        </Text>
        {statusActions.map((action) => (
          <View key={action.next} style={styles.actionRow}>
            <PrimaryButton
              title={action.label}
              variant={action.variant}
              loading={busy}
              onPress={() => changeStatus(action.next)}
            />
          </View>
        ))}
      </View>

      {canCreateAuthorization ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Autorización post-inicio</Text>
          <Text style={styles.cardSub}>
            Comparte un enlace para permitir altas y bajas después de iniciar el torneo. Solo el
            dueño de la organización puede generarlo.
          </Text>

          <TextField
            label="Etiqueta (opcional)"
            placeholder="Ej. Representante equipo 3"
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
          <PrimaryButton title="Generar enlace" loading={creating} onPress={submitCreate} />

          {created ? (
            <View style={styles.createdCard}>
              <Text style={styles.createdTitle}>Enlace generado</Text>
              <Text style={styles.createdNote}>
                Cópialo ahora: por seguridad el token completo solo se muestra una vez.
              </Text>
              <Text selectable style={styles.link}>
                {created.authorizeUrl}
              </Text>
              <Image source={{ uri: created.qrDataUrl }} style={styles.qr} resizeMode="contain" />
              <PrimaryButton title="Compartir enlace" onPress={() => shareLink(created.authorizeUrl)} />
              {authorizationToken === created.token ? (
                <Text style={styles.activeNote}>Autorización activa en este dispositivo.</Text>
              ) : (
                <View style={styles.actionRow}>
                  <PrimaryButton
                    title="Activar en este dispositivo"
                    variant="outline"
                    onPress={() => activateAuthorization(created.token)}
                  />
                </View>
              )}
            </View>
          ) : null}

          <Text style={styles.listTitle}>
            Enlaces {loadingList ? '(cargando…)' : `(${authorizations.length})`}
          </Text>
          {authorizations.length === 0 ? (
            <Text style={styles.note}>Todavía no hay enlaces generados.</Text>
          ) : (
            authorizations.map((item) => (
              <View key={item.id} style={styles.authRow}>
                <View style={styles.authInfo}>
                  <Text style={styles.authLabel}>{item.label || 'Sin etiqueta'}</Text>
                  <Text style={styles.authMeta}>
                    {item.status === 'active' ? 'Activo' : 'Revocado'} · {item.usedCount} uso
                    {item.usedCount === 1 ? '' : 's'}
                    {item.maxUses ? ` de ${item.maxUses}` : ''}
                    {item.expiresAt ? ` · vence ${item.expiresAt.slice(0, 10)}` : ''}
                  </Text>
                </View>
                {item.status === 'active' ? (
                  <Pressable onPress={() => revoke(item.id)} style={styles.revokeButton}>
                    <Text style={styles.revokeText}>Revocar</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>
      ) : null}
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
  actionRow: { marginTop: 10 },
  createdCard: {
    marginTop: 16,
    backgroundColor: colors.pillBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  createdTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
  createdNote: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  link: { color: colors.green, fontWeight: '700', fontSize: 13 },
  qr: { width: 180, height: 180, alignSelf: 'center', backgroundColor: colors.white },
  activeNote: { color: colors.green, fontWeight: '800', fontSize: 13, marginTop: 4 },
  listTitle: { fontSize: 14, fontWeight: '900', color: colors.ink, marginTop: 18, marginBottom: 8 },
  note: { color: colors.muted, paddingVertical: 6 },
  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
    gap: 10,
  },
  authInfo: { flex: 1, minWidth: 0 },
  authLabel: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  authMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  revokeButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  revokeText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
});
