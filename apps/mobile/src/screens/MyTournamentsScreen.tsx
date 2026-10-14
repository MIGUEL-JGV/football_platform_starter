import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TournamentCard } from '../components/TournamentCard';
import { EmptyState, ErrorBanner, Loading, PrimaryButton } from '../components/ui';
import { myTournaments, TournamentDetail } from '../api/tournaments';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MyTournamentsScreen() {
  const navigation = useNavigation<Nav>();
  const { status, token } = useAuth();
  const [items, setItems] = useState<TournamentDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (status !== 'authenticated' || !token) {
        return;
      }
      let active = true;
      setLoading(true);
      setError(null);
      myTournaments(token)
        .then((result) => {
          if (active) setItems(result.items);
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [status, token]),
  );

  if (status !== 'authenticated') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.guest}>
          <Text style={styles.eyebrow}>MIS TORNEOS</Text>
          <Text style={styles.title}>Guarda tus torneos</Text>
          <Text style={styles.subtitle}>
            Inicia sesión para seguir torneos y encontrarlos aquí marcados como favoritos.
          </Text>
          <PrimaryButton title="Iniciar sesión" onPress={() => navigation.navigate('Login')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Mis torneos</Text>
          <Pressable
            onPress={() => navigation.navigate('CreateTournament')}
            style={({ pressed }) => [styles.createBtn, pressed && styles.createBtnPressed]}
          >
            <Text style={styles.createBtnText}>+ Crear torneo</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Los que sigues y en los que participas.</Text>
      </View>
      {loading ? (
        <Loading label="Cargando…" />
      ) : error ? (
        <View style={styles.errorWrap}>
          <ErrorBanner message={error} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="Aún no sigues torneos"
              message="Explora torneos en Inicio y toca “Seguir” para guardarlos aquí."
            />
          }
          renderItem={({ item }) => (
            <TournamentCard
              tournament={item}
              badge={
                item.following
                  ? 'Siguiendo'
                  : item.myRole
                    ? item.myRole === 'manager'
                      ? 'Manager'
                      : 'Miembro'
                    : undefined
              }
              onPress={() =>
                navigation.navigate('TournamentDetail', { tournamentId: item.id, name: item.name })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  createBtn: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  createBtnPressed: { opacity: 0.85 },
  createBtnText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  guest: { flex: 1, padding: 24, justifyContent: 'center', gap: 10 },
  eyebrow: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: { fontSize: 30, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  subtitle: { color: colors.muted, lineHeight: 21, marginBottom: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  errorWrap: { paddingHorizontal: 20 },
});