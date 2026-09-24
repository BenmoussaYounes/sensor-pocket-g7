import { API_BASE_URL, DEVICE_ID, checkConfig } from "./config";

export async function setLedState(nextState: boolean): Promise<boolean> {
  checkConfig();

  const response = await fetch(`${API_BASE_URL}/devices/${DEVICE_ID}/led`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ on: nextState }),
  });

  if (!response.ok) {
    throw new Error("Commande LED refusée");
  }

  return nextState;
}
