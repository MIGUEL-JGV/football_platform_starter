import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Loading, PrimaryButton } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AccountScreen() {
  const navigation = useNavigation<Nav>();
  const { status, user, signOut } = useAuth();

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (status !== 'authenticated' || !user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.guest}>
          <Text style={styles.eyebrow}>CUENTA</Text>
          <Text style={styles.title}>Únete a Cancha+</Text>
          <Text style={styles.subtitle}>
            Solo te tomará un minuto. Podrás seguir torneos desde el primer ingreso.
          </Text>
          <PrimaryButton title="Iniciar sesión" onPress={() => navigation.navigate('Login')} />
          <PrimaryButton
            title="Crear una cuenta"
            variant="outline"
            onPress={() => navigation.navigate('Register')}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>CUENTA</Text>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.displayName.trim().charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user.displayName}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Estado de cuenta</Text>
          <Text style={styles.cardValue}>Activa · Sesión iniciada</Text>
        </View>
        <PrimaryButton title="Cerrar sesión" variant="outline" onPress={() => signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingTop: 16, gap: 14 },
  guest: { padding: 20, paddingTop: 24, gap: 12 },
  eyebrow: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: { fontSize: 30, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  subtitle: { color: colors.muted, lineHeight: 21, marginBottom: 8 },
  profile: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.art,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 24, fontWeight: '900' },
  profileInfo: { marginLeft: 14, flex: 1 },
  name: { fontSize: 22, fontWeight: '800', color: colors.ink },
  email: { color: colors.muted, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  cardValue: { color: colors.ink, fontSize: 15, fontWeight: '700', marginTop: 4 },
});