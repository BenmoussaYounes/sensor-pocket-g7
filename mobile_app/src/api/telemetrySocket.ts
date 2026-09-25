import { API_BASE_URL, checkConfig } from "./config";

export type Telemetry = {
  t?: number;
  h?: number;
};

type SocketCallbacks = {
  onOpen: () => void;
  onMessage: (data: Telemetry) => void;
  onError: (error: string) => void;
  onClose: () => void;
};

// Backoff exponentiel : on retente vite au début, puis de moins en moins
// souvent, sans jamais dépasser 15s entre deux tentatives.
const MIN_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 15000;

export function connectTelemetrySocket(callbacks: SocketCallbacks) {
  try {
    checkConfig();
  } catch (err: any) {
    // Erreur de configuration (URL/API manquante) : pas la peine de boucler,
    // ça ne se réparera pas tout seul.
    callbacks.onError(err.message);
    return () => {};
  }

  const wsUrl = `${API_BASE_URL!.replace(/^http/, "ws")}/ws/telemetry`;

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let stopped = false;

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    clearReconnectTimer();

    const delay = Math.min(
      MIN_RECONNECT_DELAY_MS * 2 ** attempt,
      MAX_RECONNECT_DELAY_MS,
    );
    attempt += 1;
    reconnectTimer = setTimeout(open, delay);
  };

  const open = () => {
    if (stopped) return;

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      // Connexion réussie : on repart de zéro pour le prochain souci éventuel.
      attempt = 0;
      callbacks.onOpen();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Telemetry;
        callbacks.onMessage(data);
      } catch {
        callbacks.onError("Message de télémétrie invalide");
      }
    };

    socket.onerror = () => {
      callbacks.onError("Connexion au serveur impossible");
    };

    socket.onclose = () => {
      callbacks.onClose();
      // Le backend peut redémarrer ou revenir plus tard : on ne baisse
      // jamais les bras, on reprogramme une tentative au lieu de s'arrêter.
      scheduleReconnect();
    };
  };

  open();

  return () => {
    stopped = true;
    clearReconnectTimer();
    if (socket) {
      // On détache les handlers avant de fermer pour que le onclose du
      // socket qu'on ferme nous-mêmes ne relance pas une reconnexion.
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.close();
    }
  };
}
