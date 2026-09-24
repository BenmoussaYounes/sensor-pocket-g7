import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE_URL = 'http://10.120.132.228:3000';
const DEVICE_ID = 'esp-01';

type Telemetry = {
  t?: number;
  h?: number;
};

export default function HomeScreen() {
  const [ledOn, setLedOn] = useState(false);
  const [telemetry, setTelemetry] = useState<Telemetry>({});
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = new WebSocket(`${API_BASE_URL.replace('http://', 'ws://')}/ws/telemetry`);

    socket.onopen = () => {
      setConnected(true);
      setError(null);
    };
    socket.onmessage = (event) => {
      try {
        setTelemetry(JSON.parse(event.data) as Telemetry);
      } catch {
        setError('Message de télémétrie invalide');
      }
    };
    socket.onerror = () => setError('Connexion au serveur impossible');
    socket.onclose = () => setConnected(false);

    return () => socket.close();
  }, []);

  async function toggleLed() {
    const nextState = !ledOn;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/devices/${DEVICE_ID}/led`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ on: nextState }),
      });

      if (!response.ok) {
        throw new Error('Commande LED refusée');
      }

      setLedOn(nextState);
    } catch {
      setError('Impossible de modifier la LED');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>SERVEUR G7</Text>
            <Text style={styles.title}>Mon capteur</Text>
          </View>
          <View style={[styles.statusDot, connected ? styles.online : styles.offline]} />
        </View>

        <View style={styles.sensorCard}>
          <Text style={styles.cardLabel}>TEMPÉRATURE</Text>
          <Text style={styles.mainValue}>{telemetry.t != null ? `${telemetry.t.toFixed(1)}°` : '--'}</Text>
          <Text style={styles.unit}>Celsius</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.smallCard}>
            <Text style={styles.cardLabel}>HUMIDITÉ</Text>
            <Text style={styles.smallValue}>{telemetry.h != null ? `${telemetry.h.toFixed(1)}%` : '--'}</Text>
            <Text style={styles.unit}>Air ambiant</Text>
          </View>
          <View style={styles.smallCard}>
            <Text style={styles.cardLabel}>LED</Text>
            <Text style={[styles.smallValue, ledOn ? styles.ledOn : styles.ledOff]}>{ledOn ? 'ON' : 'OFF'}</Text>
            <Text style={styles.unit}>{connected ? 'Prête à commander' : 'Serveur hors ligne'}</Text>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <Pressable
        accessibilityLabel={ledOn ? 'Éteindre la LED' : 'Allumer la LED'}
        accessibilityRole="button"
        disabled={loading}
        onPress={toggleLed}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
        {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.fabText}>{ledOn ? 'OFF' : 'ON'}</Text>}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7F2' },
  container: { flexGrow: 1, padding: 24, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 },
  eyebrow: { color: '#71806F', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#15251B', fontSize: 34, fontWeight: '800', marginTop: 6 },
  statusDot: { borderRadius: 12, height: 14, width: 14 },
  online: { backgroundColor: '#4EBD75' },
  offline: { backgroundColor: '#C7CEC8' },
  sensorCard: { backgroundColor: '#DCEFE0', borderRadius: 24, padding: 24, minHeight: 220, justifyContent: 'center' },
  cardLabel: { color: '#71806F', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  mainValue: { color: '#15251B', fontSize: 72, fontWeight: '800', marginTop: 18 },
  unit: { color: '#71806F', fontSize: 14, marginTop: 4 },
  row: { flexDirection: 'row', gap: 14, marginTop: 14 },
  smallCard: { backgroundColor: '#FFFFFF', borderRadius: 20, flex: 1, minHeight: 145, padding: 18 },
  smallValue: { color: '#15251B', fontSize: 30, fontWeight: '800', marginTop: 22 },
  ledOn: { color: '#3A9D5D' },
  ledOff: { color: '#71806F' },
  error: { color: '#B23A48', fontSize: 14, marginTop: 20, textAlign: 'center' },
  fab: { alignItems: 'center', backgroundColor: '#15251B', borderRadius: 32, bottom: 28, elevation: 6, height: 64, justifyContent: 'center', position: 'absolute', right: 24, shadowColor: '#15251B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, width: 64 },
  fabPressed: { opacity: 0.75 },
  fabText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
