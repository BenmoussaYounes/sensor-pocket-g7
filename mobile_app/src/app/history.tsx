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
import { useRouter } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import { useSensorStore } from "../store/useSensorStore";
import { HistoricalMeasurement } from "../api/telemetryApi";

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
  t: "#3A9D5D",
  h: "#3A7FBF",
};
const METRIC_SUFFIX: Record<Metric, string> = {
  t: "°C",
  h: "%",
};

export default function HistoryScreen() {
  const router = useRouter();
  const { history, historyLoading, error, loadHistory } = useSensorStore();
  const [metric, setMetric] = useState<Metric>("t");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");

  useEffect(() => {
    // Par défaut, charger les 24 dernières heures.
    // ATTENTION : ts est stocké en secondes epoch côté serveur, pas en ms.
    const nowSec = Math.floor(Date.now() / 1000);
    const twentyFourHoursAgoSec = nowSec - 24 * 60 * 60;
    loadHistory(twentyFourHoursAgoSec, nowSec);
  }, [loadHistory]);

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
          <Text style={styles.value}>
            Temp :{" "}
            <Text style={styles.bold}>
              {item.t != null ? `${item.t.toFixed(1)}°C` : "--"}
            </Text>
          </Text>
          <Text style={styles.value}>
            Humidité :{" "}
            <Text style={styles.bold}>
              {item.h != null ? `${item.h.toFixed(1)}%` : "--"}
            </Text>
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <Text style={styles.title}>Historique</Text>
      </View>

      <View style={styles.toggleRow}>
        <Segmented
          options={[
            { value: "chart", label: "Graphique" },
            { value: "list", label: "Liste" },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as ViewMode)}
        />
        {viewMode === "chart" && (
          <Segmented
            options={[
              { value: "t", label: "Température" },
              { value: "h", label: "Humidité" },
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
          color="#15251B"
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
                backgroundGradientFrom: "#FFFFFF",
                backgroundGradientTo: "#FFFFFF",
                decimalPlaces: 1,
                color: () => METRIC_COLOR[metric],
                labelColor: () => "#71806F",
                propsForDots: { r: "3" },
                propsForBackgroundLines: { stroke: "#EDEFEA" },
              }}
              style={styles.chart}
            />
          </ScrollView>
          <Text style={styles.chartCaption}>
            {chartPoints.length} point{chartPoints.length > 1 ? "s" : ""} —{" "}
            {METRIC_LABEL[metric]}
          </Text>
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
  options: { value: T; label: string }[];
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
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
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
  safeArea: { flex: 1, backgroundColor: "#F5F7F2" },
  header: { flexDirection: "row", alignItems: "center", padding: 20, gap: 16 },
  backBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  backText: { color: "#15251B", fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "800", color: "#15251B" },
  toggleRow: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 8,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#E7EBE3",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: "#FFFFFF" },
  segmentText: { color: "#71806F", fontWeight: "600", fontSize: 13 },
  segmentTextActive: { color: "#15251B" },
  list: { padding: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  time: { color: "#71806F", fontSize: 13, fontWeight: "600" },
  seq: { color: "#A0ACA0", fontSize: 12 },
  valuesRow: { flexDirection: "row", justifyContent: "space-between" },
  value: { fontSize: 15, color: "#15251B" },
  bold: { fontWeight: "700", color: "#3A9D5D" },
  error: { color: "#B23A48", textAlign: "center", marginTop: 20 },
  empty: { textAlign: "center", color: "#71806F", marginTop: 40 },
  chartContainer: { padding: 20, alignItems: "center" },
  chart: { borderRadius: 16 },
  chartCaption: { color: "#71806F", fontSize: 12, marginTop: 8 },
});
