import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ErrorBanner, PrimaryButton, TextField } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('demo@cancha.mx');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Bienvenido de vuelta</Text>
        <Text style={styles.subtitle}>
          Inicia sesión para seguir torneos y administrarlos.
        </Text>
        <Text style={styles.hint}>Demo: demo@cancha.mx / demo1234</Text>
        {error ? <ErrorBanner message={error} /> : null}
        <TextField
          label="Correo"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="tu@correo.com"
        />
        <TextField
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        <PrimaryButton title="Iniciar sesión" onPress={submit} loading={loading} />
        <PrimaryButton
          title="Crear una cuenta"
          variant="outline"
          onPress={() => navigation.navigate('Register')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingTop: 28, gap: 12 },
  title: { fontSize: 30, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  subtitle: { color: colors.muted, lineHeight: 21, marginBottom: 4 },
  hint: {
    color: colors.green,
    fontWeight: '700',
    fontSize: 12,
    backgroundColor: colors.pillBg,
    borderRadius: 10,
    padding: 10,
  },
});