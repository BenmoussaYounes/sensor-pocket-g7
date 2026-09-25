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
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import {
  COLORS,
  IconBulb,
  IconChartBars,
  IconChevronLeft,
  IconDroplet,
  IconGauge,
  IconThermometer,
} from "../../components/fridge-icons";
import { useSensorStore } from "../../store/useSensorStore";
import { fetchDevice, DeviceSummary } from "../../api/devicesApi";
import { formatRelativeTime } from "../../utils/format";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const CHART_HEIGHT = 150;

export default function DeviceDetailScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const router = useRouter();

  const {
    devices,
    telemetryByDevice,
    readingsByDevice,
    ledByDevice,
    ledLoadingByDevice,
    connected,
    error,
    toggleLed,
  } = useSensorStore();

  const [chartWidth, setChartWidth] = useState(0);
  const [fallbackDevice, setFallbackDevice] = useState<DeviceSummary | null>(
    null,
  );
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  const knownDevice = devices.find((d) => d.id === deviceId);

  useEffect(() => {
    // Si on arrive directement sur cet écran (deep link) sans être passé par
    // le tableau de bord, la liste des frigos peut être vide : on va
    // chercher ce device précis en secours.
    if (!deviceId || knownDevice) return;
    fetchDevice(deviceId)
      .then(setFallbackDevice)
      .catch((err) => setFallbackError(err.message));
  }, [deviceId, knownDevice]);

  if (!deviceId) {
    return null;
  }

  const device = knownDevice ?? fallbackDevice;
  const telemetry = telemetryByDevice[deviceId] ?? {};
  const ledOn = ledByDevice[deviceId] ?? false;
  const ledLoading = ledLoadingByDevice[deviceId] ?? false;

  const now = Date.now();
  const chartStart = now - TEN_MINUTES_MS;
  const chartReadings = (readingsByDevice[deviceId] ?? []).filter(
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
  const isOnline = device?.status === "online";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <IconChevronLeft />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>
              {device?.groupe ?? "FRIGO"}
            </Text>
            <Text style={styles.title}>{deviceId}</Text>
          </View>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                isOnline ? styles.online : styles.offline,
              ]}
            />
            <Text style={styles.statusText}>
              {isOnline ? "En ligne" : "Hors ligne"}
            </Text>
          </View>
        </View>

        <Text style={styles.activity}>
          Dernière activité : {formatRelativeTime(device?.last_activity)}
          {!connected ? " · Flux temps réel hors ligne" : ""}
        </Text>

        {fallbackError && !device && (
          <Text style={styles.error}>{fallbackError}</Text>
        )}

        <View style={styles.navRow}>
          <Link
            href={{
              pathname: "/device-history/[deviceId]",
              params: { deviceId },
            }}
            asChild
          >
            <Pressable style={styles.navBtn}>
              <IconChartBars size={14} color={COLORS.textDark} />
              <Text style={styles.navBtnText}>Historique</Text>
            </Pressable>
          </Link>
          <Link
            href={{
              pathname: "/device-thresholds/[deviceId]",
              params: { deviceId },
            }}
            asChild
          >
            <Pressable style={styles.navBtn}>
              <IconGauge size={14} color={COLORS.textDark} />
              <Text style={styles.navBtnText}>Seuils</Text>
            </Pressable>
          </Link>
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
              <Svg width={chartPlotWidth} height={CHART_HEIGHT} style={styles.chartSvg}>
                <Defs>
                  <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={COLORS.cold} stopOpacity={0.28} />
                    <Stop offset="1" stopColor={COLORS.cold} stopOpacity={0} />
                  </LinearGradient>
                </Defs>

                <Line x1="0" y1={CHART_HEIGHT * 0.25} x2={chartPlotWidth} y2={CHART_HEIGHT * 0.25} stroke={COLORS.border} strokeWidth={1} strokeDasharray="4 5" />
                <Line x1="0" y1={CHART_HEIGHT * 0.5} x2={chartPlotWidth} y2={CHART_HEIGHT * 0.5} stroke={COLORS.border} strokeWidth={1} strokeDasharray="4 5" />
                <Line x1="0" y1={CHART_HEIGHT * 0.75} x2={chartPlotWidth} y2={CHART_HEIGHT * 0.75} stroke={COLORS.border} strokeWidth={1} strokeDasharray="4 5" />

                {areaPath !== "" && <Path d={areaPath} fill="url(#areaFill)" stroke="none" />}
                {linePath !== "" && (
                  <Path d={linePath} stroke={COLORS.cold} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}
                {lastPoint && (
                  <Circle cx={lastPoint.x} cy={lastPoint.y} r={5} fill={COLORS.cold} stroke="#FFFFFF" strokeWidth={2} />
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
              <IconBulb size={16} color={ledOn ? COLORS.amber : COLORS.textMuted} filled={ledOn} />
              <Text style={[styles.cardLabel, { marginLeft: 6 }]}>LED</Text>
            </View>
            <Text style={[styles.smallValue, ledOn ? styles.ledOn : styles.ledOff]}>
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
        disabled={ledLoading}
        onPress={() => toggleLed(deviceId)}
        style={({ pressed }) => [
          styles.fab,
          ledOn && styles.fabOn,
          pressed && styles.fabPressed,
        ]}
      >
        {ledLoading ? (
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
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  rowCenter: { alignItems: "center", flexDirection: "row" },
  backBtn: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  eyebrow: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1.5 },
  title: { color: COLORS.textDark, fontSize: 22, fontWeight: "800", marginTop: 2 },
  statusPill: { alignItems: "center", flexDirection: "row", gap: 6 },
  statusDot: { borderRadius: 12, height: 10, width: 10 },
  online: { backgroundColor: COLORS.online },
  offline: { backgroundColor: COLORS.offline },
  statusText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  activity: { color: COLORS.textMuted, fontSize: 12, marginBottom: 20, marginTop: 4 },
  navRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  navBtn: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  navBtnText: { color: COLORS.textDark, fontWeight: "700", fontSize: 13 },
  chartCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    padding: 20,
  },
  chartHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  chartTitle: { color: COLORS.textDark, fontSize: 16, fontWeight: "800", marginTop: 2 },
  chartCurrentValue: { color: COLORS.cold, fontSize: 24, fontWeight: "800" },
  chartArea: { height: CHART_HEIGHT, marginTop: 18, overflow: "hidden", position: "relative" },
  chartSvg: { position: "absolute" },
  chartEmpty: {
    color: COLORS.textMuted,
    fontSize: 14,
    position: "absolute",
    textAlign: "center",
    top: 66,
    width: "100%",
  },
  chartAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  chartAxisLabel: { color: COLORS.textMuted, fontSize: 11 },
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
  cardLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1.2 },
  mainValue: { color: COLORS.textDark, fontSize: 66, fontWeight: "800", marginLeft: 10, marginTop: 14 },
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
  smallValue: { color: COLORS.textDark, fontSize: 30, fontWeight: "800", marginTop: 20 },
  ledOn: { color: COLORS.amber },
  ledOff: { color: COLORS.textMuted },
  error: { color: COLORS.danger, fontSize: 14, marginTop: 20, textAlign: "center" },
  fab: {
    alignItems: "center",
    backgroundColor: COLORS.textDark,
    borderRadius: 32,
    bottom: 40,
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
