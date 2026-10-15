import { API_BASE_URL, checkConfig } from "./config";
import { getAuthHeaders, handleUnauthorized } from "./authToken";

/** POST /devices/:deviceId/led — commande la LED d'un frigo précis. */
export async function setLedState(
  deviceId: string,
  nextState: boolean,
): Promise<boolean> {
  checkConfig();
  const authHeaders = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/led`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ on: nextState }),
  });

  if (response.status === 401) {
    await handleUnauthorized();
    throw new Error("Session expirée, reconnecte-toi");
  }
  if (response.status === 429) {
    throw new Error("Trop de commandes, patiente un instant");
  }
  if (!response.ok) {
    throw new Error("Commande LED refusée");
  }

  return nextState;
}
