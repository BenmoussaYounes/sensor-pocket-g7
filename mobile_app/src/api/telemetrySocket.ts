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

export function connectTelemetrySocket(callbacks: SocketCallbacks) {
  try {
    checkConfig();
  } catch (err: any) {
    callbacks.onError(err.message);
    return () => {};
  }

  const wsUrl = `${API_BASE_URL!.replace(/^http/, "ws")}/ws/telemetry`;
  const socket = new WebSocket(wsUrl);

  socket.onopen = () => callbacks.onOpen();

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as Telemetry;
      callbacks.onMessage(data);
    } catch {
      callbacks.onError("Message de télémétrie invalide");
    }
  };

  socket.onerror = () => callbacks.onError("Connexion au serveur impossible");
  socket.onclose = () => callbacks.onClose();

  return () => socket.close();
}
