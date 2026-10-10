import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

const tournaments = [
  { name: 'Copa Metropolitana', format: 'Fútbol 7', status: 'Inscripciones abiertas' },
  { name: 'Liga Regional', format: 'Fútbol 11', status: 'En preparación' },
  { name: 'Copa Relámpago', format: 'Fútbol 5', status: 'Próximamente' },
];

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>CANCHA<Text style={styles.plus}>+</Text></Text>
        <Text style={styles.eyebrow}>TODO EL FÚTBOL, EN UN SOLO LUGAR</Text>
        <Text style={styles.title}>Encuentra tu próximo torneo.</Text>
        <Text style={styles.subtitle}>Consulta calendarios, equipos, resultados y clasificaciones.</Text>
        <View style={styles.search}><Text style={styles.searchText}>Buscar torneo o equipo</Text></View>
        <Text style={styles.section}>Torneos para descubrir</Text>
        {tournaments.map((t) => (
          <View key={t.name} style={styles.card}>
            <View style={styles.art}><Text style={styles.ball}>⚽</Text><Text style={styles.format}>{t.format}</Text></View>
            <View style={styles.cardBody}>
              <Text style={styles.status}>{t.status}</Text>
              <Text style={styles.cardTitle}>{t.name}</Text>
              <Text style={styles.subtitle}>Organizador de ejemplo</Text>
            </View>
          </View>
        ))}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Mis torneos</Text>
          <Text style={styles.subtitle}>Inicia sesión para administrar tus torneos y seguir tus favoritos.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7f3' },
  container: { padding: 20, paddingBottom: 40 },
  brand: { fontSize: 24, fontWeight: '900', color: '#14241d', marginBottom: 38 },
  plus: { color: '#557c2c' },
  eyebrow: { color: '#63813c', fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 12 },
  title: { fontSize: 42, fontWeight: '900', letterSpacing: -1.5, lineHeight: 45, color: '#14241d' },
  subtitle: { color: '#65736b', lineHeight: 21, marginTop: 9 },
  search: { backgroundColor: '#fff', borderColor: '#dfe6dd', borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 22 },
  searchText: { color: '#65736b' },
  section: { fontSize: 25, fontWeight: '800', color: '#14241d', marginTop: 38, marginBottom: 17 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderColor: '#dfe6dd', borderWidth: 1 },
  art: { height: 125, backgroundColor: '#254b34', justifyContent: 'center', alignItems: 'center' },
  ball: { fontSize: 45 },
  format: { position: 'absolute', top: 12, left: 12, backgroundColor: '#ffffffdd', overflow: 'hidden', padding: 7, borderRadius: 20, fontSize: 11, fontWeight: '800' },
  cardBody: { padding: 17 },
  status: { color: '#50782d', fontSize: 11, fontWeight: '800' },
  cardTitle: { color: '#14241d', fontSize: 20, fontWeight: '800', marginTop: 8 },
  footer: { backgroundColor: '#193b2b', padding: 23, borderRadius: 16, marginTop: 20 },
  footerTitle: { color: '#fff', fontSize: 25, fontWeight: '800' }
});
