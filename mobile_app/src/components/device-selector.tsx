import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { COLORS, IconChevronRight } from "./fridge-icons";
import { useSensorStore } from "../store/useSensorStore";

export function DeviceSelector({
  deviceId,
  route,
}: {
  deviceId: string;
  route: "/device/[deviceId]" | "/device-history/[deviceId]" | "/device-thresholds/[deviceId]";
}) {
  const { devices } = useSensorStore();
  const [open, setOpen] = useState(false);

  if (!deviceId || devices.length === 0) return null;

  const current = devices.find((d) => d.id === deviceId);

  const selectDevice = (nextId: string) => {
    setOpen(false);
    if (nextId === deviceId) return;
    router.replace({ pathname: route, params: { deviceId: nextId } });
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Choisir un frigo"
      >
        <View>
          <Text style={styles.group}>{current?.groupe ?? "FRIGO"}</Text>
          <Text style={styles.name}>{deviceId}</Text>
        </View>
        <IconChevronRight size={16} color={COLORS.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={() => {}}>
            <Text style={styles.title}>Choisir un frigo</Text>
            {devices.map((device) => {
              const active = device.id === deviceId;
              return (
                <Pressable
                  key={device.id}
                  onPress={() => selectDevice(device.id)}
                  style={[styles.item, active && styles.itemActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.group}>{device.groupe}</Text>
                    <Text style={styles.itemName}>{device.id}</Text>
                  </View>
                  <View style={[styles.dot, device.status === "online" ? styles.online : styles.offline]} />
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "flex-start",
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  menu: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    maxHeight: "70%",
  },
  title: {
    color: COLORS.textDark,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  trigger: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minWidth: 150,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pressed: { opacity: 0.75 },
  group: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  name: { color: COLORS.textDark, fontSize: 14, fontWeight: "800", marginTop: 1 },
  item: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  itemActive: { backgroundColor: COLORS.bg },
  itemName: { color: COLORS.textDark, fontSize: 15, fontWeight: "700", marginTop: 2 },
  dot: { borderRadius: 5, height: 10, width: 10 },
  online: { backgroundColor: COLORS.online },
  offline: { backgroundColor: COLORS.offline },
});
