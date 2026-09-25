import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router, useRouter } from "expo-router";
import {
  COLORS,
  IconChevronRight,
  IconDroplet,
  IconFridge,
  IconRefresh,
  IconThermometer,
} from "../components/fridge-icons";
import { useSensorStore } from "../store/useSensorStore";
import { formatRelativeTime } from "../utils/format";

const DEVICES_POLL_MS = 15000;

export default function DashboardScreen() {
  const {
    devices,
    devicesLoading,
    devicesError,
    telemetryByDevice,
    activeAlertsByDevice,
    connected,
    loadDevices,
  } = useSensorStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, DEVICES_POLL_MS);
    return () => clearInterval(interval);
  }, [loadDevices]);

  // À l'ouverture de l'app, afficher directement le premier device disponible
  // au lieu du dashboard qui liste tous les devices.
  useEffect(() => {
    if (devices.length === 0) return;

    const firstDevice = devices[0];
    router.replace({
      pathname: "/device/[deviceId]",
      params: { deviceId: firstDevice.id },
    });
  }, [devices, router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDevices();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.brandBadge}>
              <IconFridge size={22} color={COLORS.textDark} />
            </View>
            <View>
              <Text style={styles.eyebrow}>PARC CONNECTÉ</Text>
              <Text style={styles.title}>Mes frigos</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={loadDevices} style={styles.refreshBtn}>
              <IconRefresh size={16} color={COLORS.textDark} />
            </Pressable>
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  connected ? styles.online : styles.offline,
                ]}
              />
              <Text style={styles.statusText}>
                {connected ? "Flux en direct" : "Flux hors ligne"}
              </Text>
            </View>
          </View>
        </View>

        {devicesLoading && devices.length === 0 && (
          <ActivityIndicator
            style={{ marginTop: 40 }}
            size="large"
            color={COLORS.textDark}
          />
        )}

        {devicesError && devices.length === 0 && (
          <Text style={styles.error}>{devicesError}</Text>
        )}

        {!devicesLoading && !devicesError && devices.length === 0 && (
          <Text style={styles.empty}>
            Aucun frigo détecté pour l'instant. Vérifie que les appareils sont
            bien connectés.
          </Text>
        )}

        {devices.map((device) => {
          const telemetry = telemetryByDevice[device.id];
          const isOnline = device.status === "online";
          const hasActiveAlert = Boolean(activeAlertsByDevice[device.id]);

          return (
            <Link
              key={device.id}
              href={{ pathname: "/device/[deviceId]", params: { deviceId: device.id } }}
              asChild
            >
              <Pressable
                style={({ pressed }) => [
                  styles.deviceCard,
                  pressed && styles.deviceCardPressed,
                ]}
              >
                <View style={styles.deviceHandle} />

                <View style={styles.deviceCardTop}>
                  <View>
                    <Text style={styles.deviceGroup}>{device.groupe}</Text>
                    <Text style={styles.deviceName}>{device.id}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
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
                    {hasActiveAlert && (
                      <View style={styles.alertPill}>
                        <Text style={styles.alertPillText}>⚠ Alerte</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.deviceValuesRow}>
                  <View style={styles.deviceValue}>
                    <IconThermometer size={16} color={COLORS.cold} />
                    <Text style={styles.deviceValueText}>
                      {telemetry?.t != null ? `${telemetry.t.toFixed(1)}°` : "--"}
                    </Text>
                  </View>
                  <View style={styles.deviceValue}>
                    <IconDroplet size={16} color={COLORS.humidity} />
                    <Text style={styles.deviceValueText}>
                      {telemetry?.h != null ? `${telemetry.h.toFixed(1)}%` : "--"}
                    </Text>
                  </View>
                </View>

                <View style={styles.deviceCardBottom}>
                  <Text style={styles.deviceActivity}>
                    Dernière activité : {formatRelativeTime(device.last_activity)}
                  </Text>
                  <IconChevronRight />
                </View>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, padding: 24, paddingBottom: 60 },
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
  refreshBtn: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 10,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  title: { color: COLORS.textDark, fontSize: 28, fontWeight: "800", marginTop: 2 },
  statusPill: { alignItems: "center", flexDirection: "row", gap: 6 },
  statusDot: { borderRadius: 12, height: 10, width: 10 },
  online: { backgroundColor: COLORS.online },
  offline: { backgroundColor: COLORS.offline },
  statusText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  alertPill: {
    backgroundColor: "#FDECEC",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  alertPillText: { color: COLORS.danger, fontSize: 11, fontWeight: "700" },
  error: { color: COLORS.danger, fontSize: 14, marginTop: 30, textAlign: "center" },
  empty: { color: COLORS.textMuted, fontSize: 14, marginTop: 30, textAlign: "center" },
  deviceCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    padding: 18,
    paddingRight: 34,
  },
  deviceCardPressed: { opacity: 0.85 },
  deviceHandle: {
    backgroundColor: COLORS.handle,
    borderRadius: 5,
    height: 40,
    position: "absolute",
    right: 14,
    top: "50%",
    marginTop: -20,
    width: 6,
  },
  deviceCardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  deviceGroup: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  deviceName: { color: COLORS.textDark, fontSize: 18, fontWeight: "800", marginTop: 2 },
  deviceValuesRow: { flexDirection: "row", gap: 20, marginTop: 14 },
  deviceValue: { alignItems: "center", flexDirection: "row", gap: 6 },
  deviceValueText: { color: COLORS.textDark, fontSize: 16, fontWeight: "700" },
  deviceCardBottom: {
    alignItems: "center",
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
  },
  deviceActivity: { color: COLORS.textMuted, fontSize: 12 },
});
