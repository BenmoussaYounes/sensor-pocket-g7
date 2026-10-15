import * as SecureStore from "expo-secure-store";

// Le jeton vit uniquement dans le Keychain (iOS) / Keystore (Android) via
// expo-secure-store. Jamais dans AsyncStorage ni dans le store Zustand persisté.
const TOKEN_KEY = "sensor-pocket-auth-token";

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Authentification requise");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

// ---------------------------------------------------------------------------
// Lecture (sans vérification) du payload du JWT : sert uniquement à l'UI
// (afficher le groupe, savoir quand la session expire). La vraie vérification
// de signature reste côté backend.
// ---------------------------------------------------------------------------

export type TokenInfo = { group: string | null; expiresAtMs: number | null };

export function readTokenInfo(token: string): TokenInfo {
  try {
    const part = token.split(".")[1];
    if (!part) return { group: null, expiresAtMs: null };

    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const decode = (globalThis as any).atob as ((s: string) => string) | undefined;
    if (!decode) return { group: null, expiresAtMs: null };

    const payload = JSON.parse(decode(padded)) as {
      group?: string;
      exp?: number;
    };
    return {
      group: typeof payload.group === "string" ? payload.group : null,
      expiresAtMs: typeof payload.exp === "number" ? payload.exp * 1000 : null,
    };
  } catch {
    return { group: null, expiresAtMs: null };
  }
}

// ---------------------------------------------------------------------------
// Réaction centralisée à un 401 : les API appellent handleUnauthorized(), le
// store d'auth s'abonne et renvoie l'utilisateur vers l'écran de login.
// ---------------------------------------------------------------------------

const unauthorizedListeners = new Set<() => void>();

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export async function handleUnauthorized(): Promise<void> {
  await clearAuthToken();
  unauthorizedListeners.forEach((listener) => listener());
}
