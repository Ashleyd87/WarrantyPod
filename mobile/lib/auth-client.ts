import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config";

/** Single source of truth for better-auth's SecureStore key prefix
 *  (the plugin derives `${prefix}_cookie` / `${prefix}_session_data`). */
export const AUTH_STORAGE_PREFIX = "warranty-vault";

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: "warrantyvault",
      storagePrefix: AUTH_STORAGE_PREFIX,
      storage: SecureStore,
    }),
  ],
});

/**
 * The one session accessor screens should use. A rehydrating session can
 * briefly exist WITHOUT its user attached (better-auth's types say otherwise);
 * treating that state as signed-out here — once — is what keeps individual
 * screens from ever reading `session.user.x` off a partial object again.
 */
export function useSessionUser() {
  const { data: session, isPending } = authClient.useSession();
  return { user: session?.user ?? null, isPending };
}
