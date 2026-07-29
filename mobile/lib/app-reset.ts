import * as SecureStore from "expo-secure-store";
import { AUTH_STORAGE_PREFIX, authClient } from "./auth-client";
import { THEME_KEY } from "./theme-context";

/** Onboarding-complete flag written by the welcome screen. */
export const ONBOARDED_KEY = "warranty-vault.onboarded";

// @better-auth/expo splits SecureStore values over 1800 chars across
// `${key}.0..N` sub-keys, leaving `ba-chunks:N` in the base key. Deleting
// only the base key would strand auth material in the device keychain.
const CHUNK_MARKER = "ba-chunks:";
const CHUNK_SWEEP_MIN = 10;

async function del(key: string) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Missing keys and keychain hiccups are fine — this is best-effort cleanup.
  }
}

async function chunkCount(base: string): Promise<number> {
  try {
    const stored = await SecureStore.getItemAsync(base);
    if (stored?.startsWith(CHUNK_MARKER)) {
      const n = Number(stored.slice(CHUNK_MARKER.length));
      if (Number.isInteger(n) && n > 0) return n;
    }
  } catch {}
  return 0;
}

/**
 * Full local reset: revoke + clear the session the supported way, then purge
 * every SecureStore key the app (or better-auth) writes, chunks included.
 * Used by the root ErrorBoundary's escape hatch.
 */
export async function resetLocalAppData(): Promise<void> {
  const bases = [
    `${AUTH_STORAGE_PREFIX}_cookie`,
    `${AUTH_STORAGE_PREFIX}_session_data`,
  ];

  // Read chunk counts BEFORE sign-out — clearSessionCache overwrites the
  // base keys (erasing the ba-chunks markers) without removing the chunks.
  const counts = await Promise.all(bases.map(chunkCount));

  // Canonical sign-out: revokes the server session and clears better-auth's
  // in-memory session atom + storage cache. The plugin clears local state in
  // its request hook, so this works even when the network call fails.
  try {
    await authClient.signOut();
  } catch {}

  const deletes: Promise<void>[] = [];
  bases.forEach((base, i) => {
    deletes.push(del(base));
    // Sweep at least CHUNK_SWEEP_MIN sub-keys to catch stale chunks whose
    // marker was already overwritten by an earlier small write.
    const n = Math.max(counts[i], CHUNK_SWEEP_MIN);
    for (let c = 0; c < n; c++) deletes.push(del(`${base}.${c}`));
  });
  deletes.push(del(THEME_KEY), del(ONBOARDED_KEY));
  await Promise.all(deletes);
}
