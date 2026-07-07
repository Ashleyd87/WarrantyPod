import Constants from "expo-constants";

/**
 * Backend base URL. In development the Next.js server runs on the same
 * machine as the Metro bundler, so we derive its LAN address from Expo's
 * hostUri — the phone finds your PC automatically. Override with
 * EXPO_PUBLIC_API_URL for a deployed backend.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3000`;
  }
  return "http://localhost:3000";
}

export const API_URL = resolveApiUrl();
