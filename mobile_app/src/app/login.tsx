import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, IconFridge } from "../components/fridge-icons";
import { useAuthStore } from "../store/useAuthStore";

export default function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn);

  const [group, setGroup] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = group.trim().length > 0 && password.length > 0 && !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      // En cas de succès, le garde de navigation (_layout) redirige tout seul
      // vers l'accueil dès que le statut passe à "signedIn".
      await signIn(group, password);
    } catch (err: any) {
      setError(err?.message || "Connexion impossible");
      // On vide le mot de passe après un échec : pas de réessai par erreur.
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.brandBadge}>
            <IconFridge size={30} color={COLORS.textDark} />
          </View>
          <Text style={styles.eyebrow}>PARC CONNECTÉ</Text>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>
            Identifie-toi avec le compte de ton groupe pour piloter les frigos
            et modifier les seuils.
          </Text>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Groupe</Text>
            <TextInput
              value={group}
              onChangeText={setGroup}
              placeholder="groupe7"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              style={styles.input}
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
              Mot de passe
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              style={styles.input}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Se connecter"
              style={({ pressed }) => [
                styles.submit,
                !canSubmit && styles.submitDisabled,
                pressed && styles.submitPressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Se connecter</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  brandBadge: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 18,
    height: 60,
    justifyContent: "center",
    marginBottom: 18,
    width: 60,
  },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  title: {
    color: COLORS.textDark,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 2,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  fieldLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.bg,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.textDark,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: 14,
    textAlign: "center",
  },
  submit: {
    alignItems: "center",
    backgroundColor: COLORS.textDark,
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 16,
  },
  submitDisabled: { opacity: 0.5 },
  submitPressed: { opacity: 0.85 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
