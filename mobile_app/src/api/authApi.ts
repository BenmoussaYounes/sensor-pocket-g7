import { API_BASE_URL, checkConfig } from "./config";
import { setAuthToken } from "./authToken";

type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
};

export async function login(
  group: string,
  password: string,
): Promise<LoginResponse> {
  checkConfig();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group, password }),
    });
  } catch {
    throw new Error("Serveur injoignable");
  }

  if (response.status === 401) {
    throw new Error("Groupe ou mot de passe incorrect");
  }
  if (response.status === 429) {
    throw new Error("Trop de tentatives, réessaie dans une minute");
  }
  if (!response.ok) {
    throw new Error("Connexion refusée");
  }

  const data = (await response.json()) as LoginResponse;
  await setAuthToken(data.accessToken);
  return data;
}
