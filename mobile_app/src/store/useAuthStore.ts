import { create } from "zustand";
import { login } from "../api/authApi";
import {
  clearAuthToken,
  getAuthToken,
  readTokenInfo,
} from "../api/authToken";

type AuthStatus = "loading" | "signedOut" | "signedIn";

interface AuthState {
  status: AuthStatus;
  group: string | null;
  restore: () => Promise<void>;
  signIn: (group: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Le jeton est court (15 min côté backend) : on programme la déconnexion à
// l'expiration plutôt que d'attendre que la prochaine action échoue en 401.
let expiryTimer: ReturnType<typeof setTimeout> | null = null;

function clearExpiryTimer() {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => {
  const scheduleExpiry = (expiresAtMs: number | null) => {
    clearExpiryTimer();
    if (!expiresAtMs) return;
    const delay = Math.max(expiresAtMs - Date.now(), 0);
    // setTimeout plafonne à ~24 jours ; largement suffisant pour un JWT court.
    expiryTimer = setTimeout(() => {
      void get().signOut();
    }, delay);
  };

  return {
    status: "loading",
    group: null,

    restore: async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          set({ status: "signedOut", group: null });
          return;
        }

        const info = readTokenInfo(token);
        if (info.expiresAtMs && info.expiresAtMs <= Date.now()) {
          await clearAuthToken();
          set({ status: "signedOut", group: null });
          return;
        }

        scheduleExpiry(info.expiresAtMs);
        set({ status: "signedIn", group: info.group });
      } catch {
        set({ status: "signedOut", group: null });
      }
    },

    signIn: async (group, password) => {
      // login() stocke le jeton dans SecureStore ; en cas d'échec il lève
      // une erreur que l'écran affiche tel quel.
      const data = await login(group.trim(), password);
      const info = readTokenInfo(data.accessToken);
      scheduleExpiry(info.expiresAtMs);
      set({ status: "signedIn", group: info.group ?? group.trim() });
    },

    signOut: async () => {
      clearExpiryTimer();
      await clearAuthToken();
      set({ status: "signedOut", group: null });
    },
  };
});
