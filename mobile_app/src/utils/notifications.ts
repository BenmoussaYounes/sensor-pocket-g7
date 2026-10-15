import Constants from "expo-constants";
import { Platform } from "react-native";

import { formatAlertType } from "./format";

const isExpoGoEnvironment =
  Constants.appOwnership === "expo" ||
  Constants.expoGoConfig != null ||
  Platform.OS === "web";

let notificationsModule: typeof import("expo-notifications") | null = null;

function getNotificationsModule() {
  if (isExpoGoEnvironment) {
    return null;
  }

  if (notificationsModule) {
    return notificationsModule;
  }

  try {
    notificationsModule = require("expo-notifications");
    return notificationsModule;
  } catch {
    return null;
  }
}

let permissionsInitialized = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return false;
  }

  if (permissionsInitialized) {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  }

  permissionsInitialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const { status } = await Notifications.getPermissionsAsync();
  let finalStatus = status;

  if (status !== "granted") {
    const permissionRequest = await Notifications.requestPermissionsAsync();
    finalStatus = permissionRequest.status;
  }

  if (Platform.OS === "android" && finalStatus === "granted") {
    await Notifications.setNotificationChannelAsync("fridge-alerts", {
      name: "Alertes frigo",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#ff6b6b",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }

  return finalStatus === "granted";
}

export async function notifyFridgeAlert(
  deviceId: string,
  type: string,
  holdMinutes: number,
): Promise<void> {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) {
      return;
    }

    const Notifications = getNotificationsModule();
    if (!Notifications) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Alerte frigo",
        body: `${formatAlertType(type)} • ${deviceId} • ${holdMinutes} min`,
        sound: "default",
      },
      trigger: null,
    });
  } catch (error) {
    console.warn("Notification d’alerte impossible", error);
  }
}
