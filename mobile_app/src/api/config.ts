export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// NB : il n'y a plus de DEVICE_ID unique en dur ici. Depuis que le backend
// gère plusieurs frigos (GET /devices), chaque écran reçoit son deviceId via
// la navigation (route dynamique) plutôt que via une variable d'env globale.

export const checkConfig = () => {
  if (!API_BASE_URL) {
    throw new Error(
      "Configuration API manquante (EXPO_PUBLIC_API_BASE_URL)",
    );
  }
};
