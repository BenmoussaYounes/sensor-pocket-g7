import { API_BASE_URL, checkConfig } from "./config";

/** POST /devices/:deviceId/led — commande la LED d'un frigo précis. */
export async function setLedState(
  deviceId: string,
  nextState: boolean,
): Promise<boolean> {
  checkConfig();

  const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/led`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ on: nextState }),
  });

  if (!response.ok) {
    throw new Error("Commande LED refusée");
  }

  return nextState;
}
