// Aucune clé ni mot de passe ici : l'app ne connaît que l'URL du backend.
// Les EXPO_PUBLIC_* sont injectées dans le bundle au build (variables EAS) ;
// elles sont donc publiques par nature — n'y mettre JAMAIS de secret.
const stripTrailingSlash = (value?: string) =>
  value?.trim().replace(/\/+$/, "") || undefined;

export const API_BASE_URL = stripTrailingSlash(
  process.env.EXPO_PUBLIC_API_BASE_URL,
);
export const WS_BASE_URL = stripTrailingSlash(
  process.env.EXPO_PUBLIC_WS_BASE_URL,
);

// NB : il n'y a plus de DEVICE_ID unique en dur ici. Depuis que le backend
// gère plusieurs frigos (GET /devices), chaque écran reçoit son deviceId via
// la navigation (route dynamique) plutôt que via une variable d'env globale.

export const checkConfig = () => {
  if (!API_BASE_URL) {
    throw new Error("Configuration API manquante (EXPO_PUBLIC_API_BASE_URL)");
  }
  // En développement on tolère http:// (backend sur le LAN). Dans un build de
  // production, plus jamais de trafic en clair : le jeton JWT circule dans
  // chaque requête d'écriture.
  if (!__DEV__ && !/^https:\/\//i.test(API_BASE_URL)) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL doit être en https:// en production");
  }
};

/**
 * Base du WebSocket de télémétrie.
 * - EXPO_PUBLIC_WS_BASE_URL si définie (ex. wss://api.mondomaine.fr)
 * - sinon déduite de l'URL de l'API (https -> wss, http -> ws)
 * En production, seule une URL wss:// est acceptée.
 */
export const resolveWsBase = (): string => {
  checkConfig();
  const base = WS_BASE_URL || API_BASE_URL!.replace(/^http/i, "ws");

  if (!/^wss?:\/\//i.test(base)) {
    throw new Error("URL WebSocket invalide (attendu ws:// ou wss://)");
  }
  if (!__DEV__ && !/^wss:\/\//i.test(base)) {
    throw new Error("Le WebSocket doit être en wss:// en production");
  }
  return base;
};
