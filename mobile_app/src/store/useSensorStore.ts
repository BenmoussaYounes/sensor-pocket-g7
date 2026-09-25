import { create } from "zustand";
import { connectTelemetrySocket, Telemetry } from "../api/telemetrySocket";
import { setLedState } from "../api/ledApi";
import {
  fetchMeasurementHistory,
  HistoricalMeasurement,
} from "../api/telemetryApi";
import { DeviceSummary, fetchDevices } from "../api/devicesApi";
import {
  fetchThresholds,
  saveThresholds as saveThresholdsApi,
  Thresholds,
  ThresholdValues,
} from "../api/thresholdsApi";

export type TemperatureReading = {
  timestamp: number;
  value: number;
};

const TEN_MINUTES_MS = 10 * 60 * 1000;

// Le WebSocket est désormais global (un seul flux pour tous les frigos) et sa
// durée de vie doit couvrir toute l'app, pas un seul écran : ce verrou évite
// d'ouvrir deux fois la même connexion si initSocketConnection() est appelé
// plusieurs fois (navigation, remount en dev, etc.).
let socketAlreadyStarted = false;

interface SensorState {
  // Connexion temps réel globale
  connected: boolean;
  socketError: string | null;

  // Tableau de bord (liste des frigos)
  devices: DeviceSummary[];
  devicesLoading: boolean;
  devicesError: string | null;

  // Télémétrie live et historique court (10 min), par frigo
  telemetryByDevice: Record<string, Telemetry>;
  readingsByDevice: Record<string, TemperatureReading[]>;

  // LED, par frigo
  ledByDevice: Record<string, boolean>;
  ledLoadingByDevice: Record<string, boolean>;

  // Seuils d'alerte, par frigo
  thresholdsByDevice: Record<string, Thresholds | null>;
  thresholdsLoading: boolean;
  thresholdsError: string | null;

  // Historique (écran Historique)
  history: HistoricalMeasurement[];
  historyLoading: boolean;
  error: string | null;

  // Actions
  initSocketConnection: () => () => void;
  loadDevices: () => Promise<void>;
  toggleLed: (deviceId: string) => Promise<void>;
  loadThresholds: (deviceId: string) => Promise<void>;
  saveThresholds: (
    deviceId: string,
    values: ThresholdValues,
  ) => Promise<boolean>;
  loadHistory: (
    deviceId: string,
    fromTs: number,
    toTs: number,
  ) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useSensorStore = create<SensorState>((set, get) => ({
  connected: false,
  socketError: null,

  devices: [],
  devicesLoading: false,
  devicesError: null,

  telemetryByDevice: {},
  readingsByDevice: {},

  ledByDevice: {},
  ledLoadingByDevice: {},

  thresholdsByDevice: {},
  thresholdsLoading: false,
  thresholdsError: null,

  history: [],
  historyLoading: false,
  error: null,

  setError: (error) => set({ error }),

  initSocketConnection: () => {
    if (socketAlreadyStarted) {
      // Déjà connecté ailleurs (typiquement depuis _layout.tsx) : cet appel
      // n'a rien à démarrer ni à couper.
      return () => {};
    }
    socketAlreadyStarted = true;

    const disconnect = connectTelemetrySocket({
      onOpen: () => set({ connected: true, socketError: null }),
      onClose: () =>
        set((state) => ({
          connected: false,
          // Quand le flux WebSocket coupe, on bascule tous les équipements en "offline"
          devices: state.devices.map((device) => ({
            ...device,
            status: "offline",
          })),
        })),
      onError: (msg) => set({ socketError: msg }),
      onMessage: (message) => {
        const deviceId = message.deviceId;
        if (!deviceId) {
          // Message mal formé : on l'ignore plutôt que de faire planter
          // l'affichage d'un frigo au hasard.
          return;
        }

        const timestamp = Date.now();

        set((state) => {
          const nextTelemetryByDevice = {
            ...state.telemetryByDevice,
            [deviceId]: message,
          };

          // Un message reçu = le frigo est forcément en ligne : on met à
          // jour le tableau de bord tout de suite, sans attendre le
          // prochain rafraîchissement de GET /devices.
          const nextDevices = state.devices.map((device) =>
            device.id === deviceId
              ? { ...device, status: "online", last_activity: timestamp }
              : device,
          );

          if (typeof message.t !== "number" || !Number.isFinite(message.t)) {
            return {
              telemetryByDevice: nextTelemetryByDevice,
              devices: nextDevices,
            };
          }

          const existingReadings = state.readingsByDevice[deviceId] ?? [];
          const filtered = existingReadings.filter(
            (reading) => reading.timestamp >= timestamp - TEN_MINUTES_MS,
          );
          filtered.push({ timestamp, value: message.t });

          return {
            telemetryByDevice: nextTelemetryByDevice,
            devices: nextDevices,
            readingsByDevice: {
              ...state.readingsByDevice,
              [deviceId]: filtered,
            },
          };
        });
      },
    });

    return () => {
      socketAlreadyStarted = false;
      disconnect();
    };
  },

  loadDevices: async () => {
    set({ devicesLoading: true, devicesError: null });
    try {
      const data = await fetchDevices();
      set({ devices: data });
    } catch (err: any) {
      set({ devicesError: err.message || "Impossible de charger les frigos" });
    } finally {
      set({ devicesLoading: false });
    }
  },

  toggleLed: async (deviceId: string) => {
    const current = get().ledByDevice[deviceId] ?? false;
    set((state) => ({
      ledLoadingByDevice: { ...state.ledLoadingByDevice, [deviceId]: true },
      error: null,
    }));

    try {
      const newState = await setLedState(deviceId, !current);
      set((state) => ({
        ledByDevice: { ...state.ledByDevice, [deviceId]: newState },
      }));
    } catch (err: any) {
      set({ error: err.message || "Impossible de modifier la LED" });
    } finally {
      set((state) => ({
        ledLoadingByDevice: { ...state.ledLoadingByDevice, [deviceId]: false },
      }));
    }
  },

  loadThresholds: async (deviceId: string) => {
    set({ thresholdsLoading: true, thresholdsError: null });
    try {
      const data = await fetchThresholds(deviceId);
      set((state) => ({
        thresholdsByDevice: { ...state.thresholdsByDevice, [deviceId]: data },
      }));
    } catch (err: any) {
      set({
        thresholdsError: err.message || "Impossible de charger les seuils",
      });
    } finally {
      set({ thresholdsLoading: false });
    }
  },

  saveThresholds: async (deviceId: string, values: ThresholdValues) => {
    set({ thresholdsLoading: true, thresholdsError: null });
    try {
      const data = await saveThresholdsApi(deviceId, values);
      set((state) => ({
        thresholdsByDevice: { ...state.thresholdsByDevice, [deviceId]: data },
      }));
      return true;
    } catch (err: any) {
      set({
        thresholdsError: err.message || "Seuils refusés",
      });
      return false;
    } finally {
      set({ thresholdsLoading: false });
    }
  },

  loadHistory: async (deviceId: string, fromTs: number, toTs: number) => {
    set({ historyLoading: true, error: null });
    try {
      const data = await fetchMeasurementHistory(deviceId, fromTs, toTs);
      set({ history: data });
    } catch (err: any) {
      set({ error: err.message || "Erreur chargement historique" });
    } finally {
      set({ historyLoading: false });
    }
  },
}));
