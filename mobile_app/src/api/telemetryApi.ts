import { API_BASE_URL, DEVICE_ID, checkConfig } from "./config";

export type HistoricalMeasurement = {
  id: number;
  device: string;
  seq: number | null;
  ts: number;
  received_at: number;
  t: number | null;
  h: number | null;
};

export async function fetchMeasurementHistory(
  fromTs: number,
  toTs: number,
  limit = 100,
): Promise<HistoricalMeasurement[]> {
  checkConfig();

  // On envoie 'from' et 'to' en Query Params
  const params = new URLSearchParams({
    from: fromTs.toString(),
    to: toTs.toString(),
  });

  const response = await fetch(
    `${API_BASE_URL}/devices/${DEVICE_ID}/measurements?${params}`,
  );

  if (!response.ok) {
    throw new Error("Impossible de récupérer l'historique");
  }

  return response.json();
}
