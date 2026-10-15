import { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { onUnauthorized } from "../api/authToken";
import { useAuthStore } from "../store/useAuthStore";
import { useSensorStore } from "../store/useSensorStore";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const authStatus = useAuthStore((state) => state.status);
  const restoreAuth = useAuthStore((state) => state.restore);
  const initSocketConnection = useSensorStore(
    (state) => state.initSocketConnection,
  );

  // 1. Au démarrage : relire le jeton dans SecureStore, et se mettre à
  //    l'écoute des 401 renvoyés par le backend (jeton expiré ou refusé).
  useEffect(() => {
    void restoreAuth();
    return onUnauthorized(() => {
      void useAuthStore.getState().signOut();
    });
  }, [restoreAuth]);

  // 2. Garde de navigation : sans session on va sur /login, avec session on
  //    quitte /login. On attend d'avoir fini de lire SecureStore ("loading")
  //    pour ne pas afficher le login une demi-seconde à un utilisateur déjà
  //    connecté.
  useEffect(() => {
    if (authStatus === "loading") return;

    const onLoginScreen = segments[0] === "login";
    if (authStatus === "signedOut" && !onLoginScreen) {
      router.replace("/login");
    } else if (authStatus === "signedIn" && onLoginScreen) {
      router.replace("/");
    }
  }, [authStatus, segments, router]);

  // 3. Le WebSocket diffuse la télémétrie de TOUS les frigos : une seule
  //    connexion, ouverte tant que l'utilisateur est connecté (et coupée à la
  //    déconnexion), plutôt que recréée à chaque écran.
  useEffect(() => {
    if (authStatus !== "signedIn") return;
    const disconnect = initSocketConnection();
    return () => disconnect();
  }, [authStatus, initSocketConnection]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
