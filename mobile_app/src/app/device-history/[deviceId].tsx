import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import {
  COLORS,
  IconChartBars,
  IconChevronLeft,
  IconDroplet,
  IconList,
  IconThermometer,
} from "../../components/fridge-icons";
import { useSensorStore } from "../../store/useSensorStore";
import { HistoricalMeasurement } from "../../api/telemetryApi";

type Metric = "t" | "h";
type ViewMode = "chart" | "list";

const SCREEN_WIDTH = Dimensions.get("window").width;
// Largeur mini par point pour garder les points lisibles quand il y en a
// beaucoup ; en dessous de ce nombre de points, le graphique tient sur
// l'écran sans scroll horizontal.
const MIN_POINT_SPACING = 24;

const METRIC_LABEL: Record<Metric, string> = {
  t: "Température (°C)",
  h: "Humidité (%)",
};
const METRIC_COLOR: Record<Metric, string> = {
  t: COLORS.cold,
  h: COLORS.humidity,
};
const METRIC_SUFFIX: Record<Metric, string> = {
  t: "°C",
  h: "%",
};

export default function DeviceHistoryScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const router = useRouter();
  const { history, historyLoading, error, loadHistory } = useSensorStore();
  const [metric, setMetric] = useState<Metric>("t");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");

  useEffect(() => {
    if (!deviceId) return;
    // Par défaut, charger les 24 dernières heures.
    // ATTENTION : ts est stocké en secondes epoch côté serveur, pas en ms.
    const nowSec = Math.floor(Date.now() / 1000);
    const twentyFourHoursAgoSec = nowSec - 24 * 60 * 60;
    loadHistory(deviceId, twentyFourHoursAgoSec, nowSec);
  }, [deviceId, loadHistory]);

  // Ne garder que les points où la métrique choisie est renseignée
  // (h peut être absent de certains messages telemetry).
  const chartPoints = useMemo(
    () => history.filter((m) => m[metric] != null),
    [history, metric],
  );

  const chartData = useMemo(() => {
    const labelEvery = Math.max(1, Math.ceil(chartPoints.length / 6));
    return {
      labels: chartPoints.map((m, i) =>
        i % labelEvery === 0
          ? new Date(m.ts * 1000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      ),
      datasets: [
        {
          data: chartPoints.map((m) => m[metric] as number),
          color: () => METRIC_COLOR[metric],
          strokeWidth: 2,
        },
      ],
    };
  }, [chartPoints, metric]);

  const chartWidth = Math.max(
    SCREEN_WIDTH - 40,
    chartPoints.length * MIN_POINT_SPACING,
  );

  const renderItem = ({ item }: { item: HistoricalMeasurement }) => {
    const dateStr = new Date(item.ts * 1000).toLocaleTimeString();
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.time}>{dateStr}</Text>
          <Text style={styles.seq}>#{item.id}</Text>
        </View>
        <View style={styles.valuesRow}>
          <View style={styles.rowCenter}>
            <IconThermometer size={13} />
            <Text style={styles.value}>
              {"  "}
              <Text style={[styles.bold, { color: COLORS.cold }]}>
                {item.t != null ? `${item.t.toFixed(1)}°C` : "--"}
              </Text>
            </Text>
          </View>
          <View style={styles.rowCenter}>
            <IconDroplet size={13} />
            <Text style={styles.value}>
              {"  "}
              <Text style={[styles.bold, { color: COLORS.humidity }]}>
                {item.h != null ? `${item.h.toFixed(1)}%` : "--"}
              </Text>
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconChevronLeft />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>{deviceId}</Text>
          <Text style={styles.title}>Historique</Text>
        </View>
      </View>

      <View style={styles.toggleRow}>
        <Segmented
          options={[
            { value: "chart", label: "Graphique", icon: <IconChartBars /> },
            { value: "list", label: "Liste", icon: <IconList /> },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as ViewMode)}
        />
        {viewMode === "chart" && (
          <Segmented
            options={[
              { value: "t", label: "Température", icon: <IconThermometer /> },
              { value: "h", label: "Humidité", icon: <IconDroplet /> },
            ]}
            value={metric}
            onChange={(v) => setMetric(v as Metric)}
          />
        )}
      </View>

      {historyLoading ? (
        <ActivityIndicator
          style={{ marginTop: 40 }}
          size="large"
          color={COLORS.textDark}
        />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : history.length === 0 ? (
        <Text style={styles.empty}>Aucune donnée sur cette période.</Text>
      ) : viewMode === "list" ? (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      ) : chartPoints.length === 0 ? (
        <Text style={styles.empty}>
          Pas de données de {METRIC_LABEL[metric].toLowerCase()} sur cette
          période.
        </Text>
      ) : (
        <ScrollView contentContainerStyle={styles.chartContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={chartData}
              width={chartWidth}
              height={260}
              yAxisSuffix={METRIC_SUFFIX[metric]}
              withDots={chartPoints.length <= 60}
              withInnerLines={false}
              bezier
              chartConfig={{
                backgroundGradientFrom: COLORS.card,
                backgroundGradientTo: COLORS.card,
                decimalPlaces: 1,
                color: () => METRIC_COLOR[metric],
                labelColor: () => COLORS.textMuted,
                propsForDots: { r: "3" },
                propsForBackgroundLines: { stroke: COLORS.border },
              }}
              style={styles.chart}
            />
          </ScrollView>
          <View style={styles.rowCenter}>
            {metric === "t" ? <IconThermometer size={12} /> : <IconDroplet size={12} />}
            <Text style={[styles.chartCaption, { marginLeft: 6 }]}>
              {chartPoints.length} point{chartPoints.length > 1 ? "s" : ""} —{" "}
              {METRIC_LABEL[metric]}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            {opt.icon}
            <Text
              style={[
                styles.segmentText,
                active && styles.segmentTextActive,
                opt.icon ? { marginLeft: 6 } : null,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", alignItems: "center", padding: 20, gap: 16 },
  rowCenter: { alignItems: "center", flexDirection: "row" },
  backBtn: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backText: { color: COLORS.textDark, fontWeight: "700" },
  eyebrow: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.textDark },
  toggleRow: { paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  segmented: {
    flexDirection: "row",
    backgroundColor: COLORS.segmentBg,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segment: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: COLORS.card,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 13 },
  segmentTextActive: { color: COLORS.textDark },
  list: { padding: 20 },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  time: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  seq: { color: "#9AA9B8", fontSize: 12 },
  valuesRow: { flexDirection: "row", justifyContent: "space-between" },
  value: { fontSize: 15, color: COLORS.textDark },
  bold: { fontWeight: "700" },
  error: { color: COLORS.danger, textAlign: "center", marginTop: 20 },
  empty: { textAlign: "center", color: COLORS.textMuted, marginTop: 40 },
  chartContainer: { padding: 20, alignItems: "center" },
  chart: { borderRadius: 16 },
  chartCaption: { color: COLORS.textMuted, fontSize: 12, marginTop: 8 },
});
