import { API_BASE_URL, checkConfig } from "./config";

// Le serveur diffuse maintenant la télémétrie de TOUS les frigos sur la même
// connexion WebSocket (un seul flux global) : chaque message porte désormais
// son deviceId, à charge pour le consommateur (le store) de trier.
export type Telemetry = {
  deviceId?: string;
  topic?: string;
  ts?: number;
  seq?: number;
  t?: number;
  h?: number;
};

// Le backend diffuse aussi des évènements d'alerte sur le même flux, sous
// forme d'enveloppe { event, data } — bien distincte des messages de
// télémétrie brute (qui n'ont pas de champ "event").
export type AlertStartedEvent = {
  event: "alert_started";
  data: {
    deviceId: string;
    type: string;
    holdMinutes: number;
  };
};

export type AlertStoppedEvent = {
  event: "alert_stopped";
  data: {
    deviceId: string;
    reason: string;
  };
};

export type AlertEvent = AlertStartedEvent | AlertStoppedEvent;

type SocketCallbacks = {
  onOpen: () => void;
  onMessage: (data: Telemetry) => void;
  onAlert: (alert: AlertEvent) => void;
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
    // Erreur de configuration (URL API manquante) : pas la peine de boucler,
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
        const parsed = JSON.parse(event.data);

        // Une enveloppe d'alerte porte un champ "event" ("alert_started" /
        // "alert_stopped") ; la télémétrie brute n'en a pas. C'est ce qui
        // permet de trier sur la même connexion sans changer d'endpoint.
        if (parsed && (parsed.event === "alert_started" || parsed.event === "alert_stopped")) {
          callbacks.onAlert(parsed as AlertEvent);
        } else {
          callbacks.onMessage(parsed as Telemetry);
        }
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
