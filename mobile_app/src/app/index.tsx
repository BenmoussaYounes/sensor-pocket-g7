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
import { Link } from "expo-router";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { useSensorStore } from "../store/useSensorStore";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const CHART_HEIGHT = 150;

// Palette "frigo" : blancs froids, bleu givre pour la température,
// bleu-vert pour l'humidité, ambre pour la lumière intérieure (LED).
const COLORS = {
  bg: "#EAF1F7",
  card: "#FFFFFF",
  hero: "#E4EFF8",
  handle: "#B9C8D6",
  border: "#DCE7EF",
  textDark: "#132433",
  textMuted: "#66788C",
  cold: "#2E86D6",
  coldSoft: "#DCEBFA",
  humidity: "#0E9DA8",
  amber: "#F2A93C",
  online: "#28C76F",
  offline: "#C6D0DA",
  danger: "#D64545",
};

/* ------------------------------- Icônes SVG ------------------------------ */

function IconThermometer({ size = 22, color = COLORS.cold }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13.6V5a2 2 0 1 1 4 0v8.6a4.2 4.2 0 1 1-4 0Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Line x1="12" y1="7" x2="12" y2="13.2" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx="12" cy="17.2" r="1.8" fill={color} />
    </Svg>
  );
}

function IconDroplet({ size = 22, color = COLORS.humidity }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c3.2 4.1 6.2 7.7 6.2 11.2A6.2 6.2 0 1 1 5.8 14.2C5.8 10.7 8.8 7.1 12 3Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconBulb({ size = 22, color = COLORS.textMuted, filled = false }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3a6.2 6.2 0 0 0-3.6 11.2c.5.35.8.9.8 1.5V16.4h5.6v-.7c0-.6.3-1.15.8-1.5A6.2 6.2 0 0 0 12 3Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
        fill={filled ? color : "none"}
      />
      <Line x1="9.6" y1="19" x2="14.4" y2="19" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1="10.4" y1="21.4" x2="13.6" y2="21.4" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

function IconFridge({ size = 26, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="2" width="14" height="20" rx="2.2" stroke={color} strokeWidth={1.6} />
      <Line x1="5" y1="9.2" x2="19" y2="9.2" stroke={color} strokeWidth={1.6} />
      <Line x1="7.8" y1="4.6" x2="7.8" y2="7" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Line x1="7.8" y1="11.2" x2="7.8" y2="14.8" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

function IconChartBars({ size = 16, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="12" width="3.4" height="8" rx="1" fill={color} />
      <Rect x="10.3" y="7" width="3.4" height="13" rx="1" fill={color} />
      <Rect x="16.6" y="3" width="3.4" height="17" rx="1" fill={color} />
    </Svg>
  );
}

/* --------------------------------- Écran --------------------------------- */

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

  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    chartPoints.length > 1
      ? `${linePath} L ${chartPoints[chartPoints.length - 1].x.toFixed(1)} ${CHART_HEIGHT} L ${chartPoints[0].x.toFixed(1)} ${CHART_HEIGHT} Z`
      : "";

  const lastPoint = chartPoints[chartPoints.length - 1];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.brandBadge}>
              <IconFridge size={22} color={COLORS.textDark} />
            </View>
            <View>
              <Text style={styles.eyebrow}>CAPTEUR CONNECTÉ</Text>
              <Text style={styles.title}>Mon frigo</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Link href="/history" asChild>
              <Pressable style={styles.historyBtn}>
                <IconChartBars size={14} color={COLORS.textDark} />
                <Text style={styles.historyBtnText}>Historique</Text>
              </Pressable>
            </Link>
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  connected ? styles.online : styles.offline,
                ]}
              />
              <Text style={styles.statusText}>
                {connected ? "En ligne" : "Hors ligne"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.rowCenter}>
              <IconThermometer size={16} color={COLORS.cold} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.cardLabel}>TEMPÉRATURE</Text>
                <Text style={styles.chartTitle}>10 dernières minutes</Text>
              </View>
            </View>
            <Text style={styles.chartCurrentValue}>
              {telemetry.t != null ? `${telemetry.t.toFixed(1)}°` : "--"}
            </Text>
          </View>

          <View
            onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
            style={styles.chartArea}
          >
            {chartPlotWidth > 0 && (
              <Svg
                width={chartPlotWidth}
                height={CHART_HEIGHT}
                style={styles.chartSvg}
              >
                <Defs>
                  <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={COLORS.cold} stopOpacity={0.28} />
                    <Stop offset="1" stopColor={COLORS.cold} stopOpacity={0} />
                  </LinearGradient>
                </Defs>

                <Line
                  x1="0"
                  y1={CHART_HEIGHT * 0.25}
                  x2={chartPlotWidth}
                  y2={CHART_HEIGHT * 0.25}
                  stroke={COLORS.border}
                  strokeWidth={1}
                  strokeDasharray="4 5"
                />
                <Line
                  x1="0"
                  y1={CHART_HEIGHT * 0.5}
                  x2={chartPlotWidth}
                  y2={CHART_HEIGHT * 0.5}
                  stroke={COLORS.border}
                  strokeWidth={1}
                  strokeDasharray="4 5"
                />
                <Line
                  x1="0"
                  y1={CHART_HEIGHT * 0.75}
                  x2={chartPlotWidth}
                  y2={CHART_HEIGHT * 0.75}
                  stroke={COLORS.border}
                  strokeWidth={1}
                  strokeDasharray="4 5"
                />

                {areaPath !== "" && (
                  <Path d={areaPath} fill="url(#areaFill)" stroke="none" />
                )}
                {linePath !== "" && (
                  <Path
                    d={linePath}
                    stroke={COLORS.cold}
                    strokeWidth={2.4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {lastPoint && (
                  <Circle
                    cx={lastPoint.x}
                    cy={lastPoint.y}
                    r={5}
                    fill={COLORS.cold}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                )}
              </Svg>
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
          <View style={styles.fridgeHandle} />
          <Text style={styles.cardLabel}>TEMPÉRATURE INTÉRIEURE</Text>
          <View style={styles.rowCenter}>
            <IconThermometer size={30} color={COLORS.cold} />
            <Text style={styles.mainValue}>
              {telemetry.t != null ? `${telemetry.t.toFixed(1)}°` : "--"}
            </Text>
          </View>
          <Text style={styles.unit}>Celsius</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.smallCard}>
            <View style={styles.rowCenter}>
              <IconDroplet size={16} color={COLORS.humidity} />
              <Text style={[styles.cardLabel, { marginLeft: 6 }]}>HUMIDITÉ</Text>
            </View>
            <Text style={[styles.smallValue, { color: COLORS.humidity }]}>
              {telemetry.h != null ? `${telemetry.h.toFixed(1)}%` : "--"}
            </Text>
            <Text style={styles.unit}>Air ambiant</Text>
          </View>
          <View style={styles.smallCard}>
            <View style={styles.rowCenter}>
              <IconBulb
                size={16}
                color={ledOn ? COLORS.amber : COLORS.textMuted}
                filled={ledOn}
              />
              <Text style={[styles.cardLabel, { marginLeft: 6 }]}>LED</Text>
            </View>
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
        style={({ pressed }) => [
          styles.fab,
          ledOn && styles.fabOn,
          pressed && styles.fabPressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <IconBulb size={26} color="#FFFFFF" filled={ledOn} />
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, padding: 24, paddingBottom: 120 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  brandBadge: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    marginRight: 12,
    width: 44,
  },
  headerRight: { alignItems: "flex-end", gap: 8 },
  rowCenter: { alignItems: "center", flexDirection: "row" },
  historyBtn: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  historyBtnText: { color: COLORS.textDark, fontWeight: "700", fontSize: 13 },
  statusPill: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 2,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    padding: 20,
  },
  chartHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartTitle: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  chartCurrentValue: { color: COLORS.cold, fontSize: 24, fontWeight: "800" },
  chartArea: {
    height: CHART_HEIGHT,
    marginTop: 18,
    overflow: "hidden",
    position: "relative",
  },
  chartSvg: { position: "absolute" },
  chartEmpty: {
    color: COLORS.textMuted,
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
  chartAxisLabel: { color: COLORS.textMuted, fontSize: 11 },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  title: { color: COLORS.textDark, fontSize: 28, fontWeight: "800", marginTop: 2 },
  statusDot: { borderRadius: 12, height: 10, width: 10 },
  online: { backgroundColor: COLORS.online },
  offline: { backgroundColor: COLORS.offline },
  statusText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  sensorCard: {
    backgroundColor: COLORS.hero,
    borderColor: COLORS.border,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 220,
    justifyContent: "center",
    overflow: "hidden",
    padding: 24,
    paddingRight: 40,
  },
  fridgeHandle: {
    backgroundColor: COLORS.handle,
    borderRadius: 6,
    height: 96,
    position: "absolute",
    right: 18,
    top: "50%",
    marginTop: -48,
    width: 8,
  },
  cardLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  mainValue: {
    color: COLORS.textDark,
    fontSize: 66,
    fontWeight: "800",
    marginLeft: 10,
    marginTop: 14,
  },
  unit: { color: COLORS.textMuted, fontSize: 14, marginTop: 4 },
  row: { flexDirection: "row", gap: 14, marginTop: 14 },
  smallCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    minHeight: 145,
    padding: 18,
  },
  smallValue: {
    color: COLORS.textDark,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 20,
  },
  ledOn: { color: COLORS.amber },
  ledOff: { color: COLORS.textMuted },
  error: { color: COLORS.danger, fontSize: 14, marginTop: 20, textAlign: "center" },
  fab: {
    alignItems: "center",
    backgroundColor: COLORS.textDark,
    borderRadius: 32,
    bottom: 72,
    elevation: 6,
    height: 64,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: 64,
  },
  fabOn: { backgroundColor: COLORS.amber },
  fabPressed: { opacity: 0.8 },
});
