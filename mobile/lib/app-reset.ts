import * as SecureStore from "expo-secure-store";
import { Directory, File, Paths } from "expo-file-system";
import { vault } from "./vault";
import { THEME_KEY } from "./theme-context";
import { TOUR_KEY } from "./tour-context";

/** Onboarding-complete flag written by the welcome screen. */
export const ONBOARDED_KEY = "warranty-vault.onboarded";

/**
 * Clears preferences only — the vault's records and photos are left alone.
 * Used by the root ErrorBoundary so a bad stored preference can't wedge the
 * app while still never destroying the user's irreplaceable data.
 */
export async function resetPreferences(): Promise<void> {
  for (const key of [THEME_KEY, TOUR_KEY, ONBOARDED_KEY]) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // A missing key is already the desired end state.
    }
  }
  vault.invalidate();
}

/**
 * Destroys everything on this device: every record and every photo. There is
 * no server copy, so this is unrecoverable without a backup export — callers
 * must confirm explicitly.
 */
export async function eraseVault(): Promise<void> {
  try {
    const photos = new Directory(Paths.document, "photos");
    if (photos.exists) photos.delete();
  } catch {
    // Fall through — the records still get cleared below.
  }
  try {
    const doc = new File(Paths.document, "vault.json");
    if (doc.exists) doc.delete();
  } catch {}
  vault.invalidate();
}
