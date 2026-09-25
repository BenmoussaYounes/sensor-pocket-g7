import { API_BASE_URL, checkConfig } from "./config";

export type HistoricalMeasurement = {
  id: number;
  device: string;
  seq: number | null;
  ts: number;
  received_at: number;
  t: number | null;
  h: number | null;
};

/** GET /devices/:deviceId/measurements — historique d'un frigo précis. */
export async function fetchMeasurementHistory(
  deviceId: string,
  fromTs: number,
  toTs: number,
  limit = 100,
): Promise<HistoricalMeasurement[]> {
  checkConfig();

  // On envoie 'from', 'to' et 'limit' en Query Params.
  const params = new URLSearchParams({
    from: fromTs.toString(),
    to: toTs.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(
    `${API_BASE_URL}/devices/${deviceId}/measurements?${params}`,
  );

  if (!response.ok) {
    throw new Error("Impossible de récupérer l'historique");
  }

  return response.json();
}
