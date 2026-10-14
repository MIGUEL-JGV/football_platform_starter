import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TournamentCard } from '../components/TournamentCard';
import { EmptyState, ErrorBanner, Loading } from '../components/ui';
import { listTournaments, TournamentListItem } from '../api/tournaments';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<TournamentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (search: string, mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await listTournaments({ q: search || undefined, pageSize: 20 });
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los torneos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => load(query), query ? 350 : 0);
    return () => clearTimeout(handle);
  }, [query, load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.brand}>
          CANCHA<Text style={styles.plus}>+</Text>
        </Text>
        <Text style={styles.eyebrow}>TODO EL FÚTBOL, EN UN SOLO LUGAR</Text>
        <Text style={styles.title}>Encuentra tu próximo torneo.</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar torneo por nombre"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.search}
        />
      </View>

      {loading ? (
        <Loading label="Cargando torneos…" />
      ) : error ? (
        <View style={styles.errorWrap}>
          <ErrorBanner message={error} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(query, 'refresh')} />
          }
          ListEmptyComponent={
            <EmptyState
              title="Sin resultados"
              message={
                query
                  ? `No encontramos torneos para “${query}”.`
                  : 'Todavía no hay torneos publicados.'
              }
            />
          }
          renderItem={({ item }) => (
            <TournamentCard
              tournament={item}
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
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  brand: { fontSize: 24, fontWeight: '900', color: colors.ink, marginBottom: 20 },
  plus: { color: colors.brandPlus },
  eyebrow: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  title: { fontSize: 34, fontWeight: '900', letterSpacing: -1, lineHeight: 38, color: colors.ink },
  search: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 18,
    color: colors.ink,
    fontSize: 15,
  },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  errorWrap: { paddingHorizontal: 20 },
});