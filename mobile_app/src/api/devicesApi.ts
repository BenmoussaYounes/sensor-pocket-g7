import { API_BASE_URL, checkConfig } from "./config";

export type DeviceSummary = {
  id: string;
  groupe: string;
  status: string;
  last_activity: number;
};

/** GET /devices — état courant de tous les frigos (pour le tableau de bord). */
export async function fetchDevices(): Promise<DeviceSummary[]> {
  checkConfig();

  const response = await fetch(`${API_BASE_URL}/devices`);

  if (!response.ok) {
    throw new Error("Impossible de récupérer la liste des frigos");
  }

  return response.json();
}

/** GET /devices/:deviceId — état courant d'un frigo précis. */
export async function fetchDevice(deviceId: string): Promise<DeviceSummary> {
  checkConfig();

  const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`);

  if (response.status === 404) {
    throw new Error("Ce frigo est introuvable");
  }
  if (!response.ok) {
    throw new Error("Impossible de récupérer ce frigo");
  }

  return response.json();
}
