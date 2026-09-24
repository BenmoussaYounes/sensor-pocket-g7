import { create } from "zustand";
import { connectTelemetrySocket, Telemetry } from "../api/telemetrySocket";
import { setLedState } from "../api/ledApi";
import {
  fetchMeasurementHistory,
  HistoricalMeasurement,
} from "../api/telemetryApi";

export type TemperatureReading = {
  timestamp: number;
  value: number;
};

const TEN_MINUTES_MS = 10 * 60 * 1000;

interface SensorState {
  ledOn: boolean;
  telemetry: Telemetry;
  connected: boolean;
  loading: boolean;
  historyLoading: boolean;
  error: string | null;
  temperatureReadings: TemperatureReading[];
  history: HistoricalMeasurement[];

  // Actions
  initSocketConnection: () => () => void;
  toggleLed: () => Promise<void>;
  loadHistory: (fromTs: number, toTs: number) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useSensorStore = create<SensorState>((set, get) => ({
  ledOn: false,
  telemetry: {},
  connected: false,
  loading: false,
  historyLoading: false,
  error: null,
  temperatureReadings: [],
  history: [],

  setError: (error) => set({ error }),

  initSocketConnection: () => {
    return connectTelemetrySocket({
      onOpen: () => set({ connected: true, error: null }),
      onClose: () => set({ connected: false }),
      onError: (msg) => set({ error: msg }),
      onMessage: (nextTelemetry) => {
        const timestamp = Date.now();
        set((state) => {
          const newReadings = [...state.temperatureReadings];

          if (
            typeof nextTelemetry.t === "number" &&
            Number.isFinite(nextTelemetry.t)
          ) {
            const filtered = newReadings.filter(
              (r) => r.timestamp >= timestamp - TEN_MINUTES_MS,
            );
            filtered.push({ timestamp, value: nextTelemetry.t });
            return { telemetry: nextTelemetry, temperatureReadings: filtered };
          }

          return { telemetry: nextTelemetry };
        });
      },
    });
  },

  toggleLed: async () => {
    const { ledOn } = get();
    set({ loading: true, error: null });

    try {
      const newState = await setLedState(!ledOn);
      set({ ledOn: newState });
    } catch (err: any) {
      set({ error: err.message || "Impossible de modifier la LED" });
    } finally {
      set({ loading: false });
    }
  },

  loadHistory: async (fromTs: number, toTs: number) => {
    set({ historyLoading: true, error: null });
    try {
      const data = await fetchMeasurementHistory(fromTs, toTs);
      set({ history: data });
    } catch (err: any) {
      set({ error: err.message || "Erreur chargement historique" });
    } finally {
      set({ historyLoading: false });
    }
  },
}));
