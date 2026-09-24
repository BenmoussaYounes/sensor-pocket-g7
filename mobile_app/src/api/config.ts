export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
export const DEVICE_ID = process.env.EXPO_PUBLIC_DEVICE_ID;

export const checkConfig = () => {
  if (!API_BASE_URL || !DEVICE_ID) {
    throw new Error("Configuration API manquante");
  }
};
