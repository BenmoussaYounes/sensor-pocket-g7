import { useEffect } from "react";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { useSensorStore } from "../store/useSensorStore";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const initSocketConnection = useSensorStore(
    (state) => state.initSocketConnection,
  );

  useEffect(() => {
    // Le WebSocket diffuse la télémétrie de TOUS les frigos : on l'ouvre une
    // seule fois ici, pour toute la durée de vie de l'app, plutôt que de le
    // recréer à chaque fois qu'on entre/sort d'un écran (dashboard, détail,
    // historique...).
    const disconnect = initSocketConnection();
    return () => disconnect();
  }, [initSocketConnection]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
