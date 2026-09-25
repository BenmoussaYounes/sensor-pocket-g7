import { API_BASE_URL, checkConfig } from "./config";

export type Thresholds = {
  device: string;
  tMin: number;
  tMax: number;
  hMin: number;
  hMax: number;
  holdMinutes: number;
  updated_at: number;
};

export type ThresholdValues = {
  tMin: number;
  tMax: number;
  hMin: number;
  hMax: number;
  holdMinutes: number;
};

/**
 * GET /devices/:deviceId/thresholds
 * Renvoie `null` (et non une erreur) quand aucun seuil n'a encore été
 * configuré pour ce frigo : c'est un état normal, pas une panne.
 */
export async function fetchThresholds(
  deviceId: string,
): Promise<Thresholds | null> {
  checkConfig();

  const response = await fetch(
    `${API_BASE_URL}/devices/${deviceId}/thresholds`,
  );

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Impossible de récupérer les seuils");
  }

  return response.json();
}

/** PUT /devices/:deviceId/thresholds — crée ou met à jour les seuils. */
export async function saveThresholds(
  deviceId: string,
  values: ThresholdValues,
): Promise<Thresholds> {
  checkConfig();

  const response = await fetch(
    `${API_BASE_URL}/devices/${deviceId}/thresholds`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new Error(message || "Seuils refusés : vérifie les valeurs saisies");
  }

  return response.json();
}
