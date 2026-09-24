import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSensorStore } from "../stores/useSensorStore";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const CHART_HEIGHT = 150;

export default function HomeScreen() {
  const {
    ledOn,
    telemetry,
    connected,
    loading,
    error,
    temperatureReadings,
    initSocketConnection,
    toggleLed,
  } = useSensorStore();

  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const disconnect = initSocketConnection();
    return () => disconnect();
  }, [initSocketConnection]);

  // Calculs du graphique
  const now = Date.now();
  const chartStart = now - TEN_MINUTES_MS;
  const chartReadings = temperatureReadings.filter(
    (reading) => reading.timestamp >= chartStart,
  );
  const chartPlotWidth = Math.max(chartWidth - 12, 0);
  const chartValues = chartReadings.map((reading) => reading.value);
  const lowestValue = chartValues.length > 0 ? Math.min(...chartValues) : 0;
  const highestValue = chartValues.length > 0 ? Math.max(...chartValues) : 1;
  const valuePadding = Math.max((highestValue - lowestValue) * 0.15, 0.5);
  const chartMinimum = lowestValue - valuePadding;
  const chartRange = highestValue - lowestValue + valuePadding * 2;

  const chartPoints = chartReadings.map((reading) => ({
    x: ((reading.timestamp - chartStart) / TEN_MINUTES_MS) * chartPlotWidth,
    y:
      CHART_HEIGHT -
      ((reading.value - chartMinimum) / chartRange) * CHART_HEIGHT,
  }));

  const chartSegments = chartPoints.slice(1).map((point, index) => {
    const previousPoint = chartPoints[index];
    const length = Math.sqrt(
      (point.x - previousPoint.x) ** 2 + (point.y - previousPoint.y) ** 2,
    );
    const angle = Math.atan2(
      point.y - previousPoint.y,
      point.x - previousPoint.x,
    );

    return {
      key: `${chartReadings[index + 1].timestamp}`,
      length,
      left: (previousPoint.x + point.x) / 2 - length / 2,
      top: (previousPoint.y + point.y) / 2 - 1.5,
      angle: `${(angle * 180) / Math.PI}deg`,
    };
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>SERVEUR G7</Text>
            <Text style={styles.title}>Mon capteur</Text>
          </View>
          <View
            style={[
              styles.statusDot,
              connected ? styles.online : styles.offline,
            ]}
          />
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.cardLabel}>TEMPÉRATURE</Text>
              <Text style={styles.chartTitle}>10 dernières minutes</Text>
            </View>
            <Text style={styles.chartCurrentValue}>
              {telemetry.t != null ? `${telemetry.t.toFixed(1)}°` : "--"}
            </Text>
          </View>

          <View
            onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
            style={styles.chartArea}
          >
            <View
              style={[styles.chartGridLine, { top: CHART_HEIGHT * 0.25 }]}
            />
            <View style={[styles.chartGridLine, { top: CHART_HEIGHT * 0.5 }]} />
            <View
              style={[styles.chartGridLine, { top: CHART_HEIGHT * 0.75 }]}
            />
            {chartSegments.map((segment) => (
              <View
                key={segment.key}
                style={[
                  styles.chartSegment,
                  {
                    left: segment.left,
                    top: segment.top,
                    transform: [{ rotate: segment.angle }],
                    width: segment.length,
                  },
                ]}
              />
            ))}
            {chartPoints.length === 1 && (
              <View
                style={[
                  styles.chartPoint,
                  { left: chartPoints[0].x - 5, top: chartPoints[0].y - 5 },
                ]}
              />
            )}
            {chartPoints.length === 0 && (
              <Text style={styles.chartEmpty}>En attente des mesures...</Text>
            )}
          </View>

          <View style={styles.chartAxis}>
            <Text style={styles.chartAxisLabel}>-10 min</Text>
            <Text style={styles.chartAxisLabel}>Maintenant</Text>
          </View>
        </View>

        <View style={styles.sensorCard}>
          <Text style={styles.cardLabel}>TEMPÉRATURE</Text>
          <Text style={styles.mainValue}>
            {telemetry.t != null ? `${telemetry.t.toFixed(1)}°` : "--"}
          </Text>
          <Text style={styles.unit}>Celsius</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.smallCard}>
            <Text style={styles.cardLabel}>HUMIDITÉ</Text>
            <Text style={styles.smallValue}>
              {telemetry.h != null ? `${telemetry.h.toFixed(1)}%` : "--"}
            </Text>
            <Text style={styles.unit}>Air ambiant</Text>
          </View>
          <View style={styles.smallCard}>
            <Text style={styles.cardLabel}>LED</Text>
            <Text
              style={[styles.smallValue, ledOn ? styles.ledOn : styles.ledOff]}
            >
              {ledOn ? "ON" : "OFF"}
            </Text>
            <Text style={styles.unit}>
              {connected ? "Prête à commander" : "Serveur hors ligne"}
            </Text>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <Pressable
        accessibilityLabel={ledOn ? "Éteindre la LED" : "Allumer la LED"}
        accessibilityRole="button"
        disabled={loading}
        onPress={toggleLed}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.fabText}>{ledOn ? "OFF" : "ON"}</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F7F2" },
  container: { flexGrow: 1, padding: 24, paddingBottom: 120 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginBottom: 14,
    padding: 20,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  chartTitle: {
    color: "#15251B",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  chartCurrentValue: { color: "#3A9D5D", fontSize: 24, fontWeight: "800" },
  chartArea: {
    height: CHART_HEIGHT,
    marginTop: 18,
    overflow: "hidden",
    position: "relative",
  },
  chartGridLine: {
    backgroundColor: "#E8EEE8",
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
  chartSegment: {
    backgroundColor: "#3A9D5D",
    borderRadius: 2,
    height: 3,
    position: "absolute",
  },
  chartPoint: {
    backgroundColor: "#3A9D5D",
    borderColor: "#FFFFFF",
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: "absolute",
    width: 10,
  },
  chartEmpty: {
    color: "#71806F",
    fontSize: 14,
    position: "absolute",
    textAlign: "center",
    top: 66,
    width: "100%",
  },
  chartAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  chartAxisLabel: { color: "#71806F", fontSize: 11 },
  eyebrow: {
    color: "#71806F",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  title: { color: "#15251B", fontSize: 34, fontWeight: "800", marginTop: 6 },
  statusDot: { borderRadius: 12, height: 14, width: 14 },
  online: { backgroundColor: "#4EBD75" },
  offline: { backgroundColor: "#C7CEC8" },
  sensorCard: {
    backgroundColor: "#DCEFE0",
    borderRadius: 24,
    padding: 24,
    minHeight: 220,
    justifyContent: "center",
  },
  cardLabel: {
    color: "#71806F",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  mainValue: {
    color: "#15251B",
    fontSize: 72,
    fontWeight: "800",
    marginTop: 18,
  },
  unit: { color: "#71806F", fontSize: 14, marginTop: 4 },
  row: { flexDirection: "row", gap: 14, marginTop: 14 },
  smallCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    flex: 1,
    minHeight: 145,
    padding: 18,
  },
  smallValue: {
    color: "#15251B",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 22,
  },
  ledOn: { color: "#3A9D5D" },
  ledOff: { color: "#71806F" },
  error: { color: "#B23A48", fontSize: 14, marginTop: 20, textAlign: "center" },
  fab: {
    alignItems: "center",
    backgroundColor: "#15251B",
    borderRadius: 32,
    bottom: 72,
    elevation: 6,
    height: 64,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    shadowColor: "#15251B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    width: 64,
  },
  fabPressed: { opacity: 0.75 },
  fabText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
