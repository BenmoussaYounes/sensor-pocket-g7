import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  COLORS,
  IconChevronLeft,
  IconDroplet,
  IconGauge,
  IconThermometer,
} from "../../components/fridge-icons";
import { useSensorStore } from "../../store/useSensorStore";
import { DeviceSelector } from "../../components/device-selector";

// Valeurs par défaut suggérées pour un frigo tant qu'aucun seuil n'a été
// configuré côté serveur (conservation froide classique).
const DEFAULT_VALUES = {
  tMin: "2",
  tMax: "8",
  hMin: "30",
  hMax: "60",
  holdMinutes: "15",
};

type FieldKey = keyof typeof DEFAULT_VALUES;

export default function DeviceThresholdsScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const router = useRouter();
  const {
    thresholdsByDevice,
    thresholdsLoading,
    thresholdsError,
    loadThresholds,
    saveThresholds,
  } = useSensorStore();

  const [values, setValues] = useState(DEFAULT_VALUES);
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    loadThresholds(deviceId);
  }, [deviceId, loadThresholds]);

  const thresholds = deviceId ? thresholdsByDevice[deviceId] : undefined;

  useEffect(() => {
    // On ne pré-remplit qu'une fois, dès que la valeur enregistrée arrive :
    // sinon on écraserait ce que l'utilisateur est en train de taper.
    if (initialized) return;
    if (thresholds === undefined) return;

    if (thresholds) {
      setValues({
        tMin: String(thresholds.tMin),
        tMax: String(thresholds.tMax),
        hMin: String(thresholds.hMin),
        hMax: String(thresholds.hMax),
        holdMinutes: String(thresholds.holdMinutes),
      });
    }
    setInitialized(true);
  }, [thresholds, initialized]);

  if (!deviceId) {
    return null;
  }

  const updateField = (key: FieldKey, text: string) => {
    setSaved(false);
    setValues((prev) => ({ ...prev, [key]: text }));
  };

  const parsed = {
    tMin: Number(values.tMin.replace(",", ".")),
    tMax: Number(values.tMax.replace(",", ".")),
    hMin: Number(values.hMin.replace(",", ".")),
    hMax: Number(values.hMax.replace(",", ".")),
    holdMinutes: Number(values.holdMinutes.replace(",", ".")),
  };

  const localError =
    Object.values(parsed).some((n) => !Number.isFinite(n))
      ? "Tous les champs doivent être des nombres"
      : parsed.tMin >= parsed.tMax
      ? "La température min doit être inférieure à la température max"
      : parsed.hMin >= parsed.hMax
      ? "L'humidité min doit être inférieure à l'humidité max"
      : parsed.holdMinutes < 0
      ? "La durée de tolérance ne peut pas être négative"
      : null;

  const onSave = async () => {
    if (localError) return;
    setSaved(false);
    const ok = await saveThresholds(deviceId, parsed);
    if (ok) setSaved(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconChevronLeft />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <DeviceSelector deviceId={deviceId} route="/device-thresholds/[deviceId]" />
          <Text style={styles.title}>Seuils d'alerte</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {!initialized && thresholdsLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORS.textDark} />
        ) : (
          <>
            {thresholds === null && (
              <Text style={styles.hint}>
                Aucun seuil n'est encore configuré pour ce frigo : des valeurs
                par défaut adaptées à une conservation froide sont proposées
                ci-dessous.
              </Text>
            )}

            <View style={styles.card}>
              <View style={styles.rowCenter}>
                <IconThermometer size={16} color={COLORS.cold} />
                <Text style={[styles.cardLabel, { marginLeft: 6 }]}>TEMPÉRATURE (°C)</Text>
              </View>
              <View style={styles.fieldRow}>
                <Field
                  label="Min"
                  value={values.tMin}
                  onChangeText={(t) => updateField("tMin", t)}
                />
                <Field
                  label="Max"
                  value={values.tMax}
                  onChangeText={(t) => updateField("tMax", t)}
                />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.rowCenter}>
                <IconDroplet size={16} color={COLORS.humidity} />
                <Text style={[styles.cardLabel, { marginLeft: 6 }]}>HUMIDITÉ (%)</Text>
              </View>
              <View style={styles.fieldRow}>
                <Field
                  label="Min"
                  value={values.hMin}
                  onChangeText={(t) => updateField("hMin", t)}
                />
                <Field
                  label="Max"
                  value={values.hMax}
                  onChangeText={(t) => updateField("hMax", t)}
                />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.rowCenter}>
                <IconGauge size={16} color={COLORS.textDark} />
                <Text style={[styles.cardLabel, { marginLeft: 6 }]}>TOLÉRANCE</Text>
              </View>
              <Field
                label="Minutes avant alerte"
                value={values.holdMinutes}
                onChangeText={(t) => updateField("holdMinutes", t)}
                full
              />
              <Text style={styles.fieldHelp}>
                Un dépassement ponctuel (ouverture de porte, dégivrage) ne
                déclenche pas d'alerte : il faut que ça persiste au moins ce
                temps-là.
              </Text>
            </View>

            <Text style={styles.summary}>
              Ce frigo alerte si la température sort de{" "}
              <Text style={styles.summaryBold}>
                {values.tMin || "?"}–{values.tMax || "?"}°C
              </Text>{" "}
              ou l'humidité de{" "}
              <Text style={styles.summaryBold}>
                {values.hMin || "?"}–{values.hMax || "?"}%
              </Text>{" "}
              pendant plus de{" "}
              <Text style={styles.summaryBold}>
                {values.holdMinutes || "?"} min
              </Text>
              .
            </Text>

            {(localError || thresholdsError) && (
              <Text style={styles.error}>{localError || thresholdsError}</Text>
            )}
            {saved && !localError && (
              <Text style={styles.success}>Seuils enregistrés.</Text>
            )}

            <Pressable
              onPress={onSave}
              disabled={thresholdsLoading || !!localError}
              style={({ pressed }) => [
                styles.saveBtn,
                (thresholdsLoading || !!localError) && styles.saveBtnDisabled,
                pressed && styles.saveBtnPressed,
              ]}
            >
              {thresholdsLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  full = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  full?: boolean;
}) {
  return (
    <View style={[styles.field, full && styles.fieldFull]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        style={styles.fieldInput}
        placeholder="0"
        placeholderTextColor={COLORS.textMuted}
      />
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
  container: { padding: 20, paddingTop: 4, paddingBottom: 60 },
  hint: {
    backgroundColor: COLORS.coldSoft,
    borderRadius: 14,
    color: COLORS.textDark,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
    padding: 14,
  },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  cardLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1.1 },
  fieldRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  field: { flex: 1 },
  fieldFull: { marginTop: 12 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
  fieldInput: {
    backgroundColor: COLORS.bg,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldHelp: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17, marginTop: 10 },
  summary: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 20, marginTop: 4 },
  summaryBold: { color: COLORS.textDark, fontWeight: "700" },
  error: { color: COLORS.danger, fontSize: 13, marginBottom: 14, textAlign: "center" },
  success: { color: COLORS.online, fontSize: 13, marginBottom: 14, textAlign: "center" },
  saveBtn: {
    alignItems: "center",
    backgroundColor: COLORS.textDark,
    borderRadius: 16,
    justifyContent: "center",
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
