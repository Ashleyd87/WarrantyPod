import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config";

/**
 * The vault itself is local (see lib/vault.ts) — the server is only used for
 * stateless AI helpers: reading a receipt, identifying a barcode, finding a
 * claim contact or a product image. Nothing personal is stored server-side.
 *
 * Those endpoints are keyed by an opaque device id purely so they can be
 * rate limited. It carries no identity and unlocks nothing.
 */

const DEVICE_ID_KEY = "warranty-vault.device-id";

function generateDeviceId(): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

let cachedDeviceId: string | null = null;

export function deviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const stored = SecureStore.getItem(DEVICE_ID_KEY);
    if (stored && /^[A-Za-z0-9_-]{16,128}$/.test(stored)) {
      cachedDeviceId = stored;
      return stored;
    }
  } catch {
    // Fall through and mint a fresh one for this session.
  }
  const fresh = generateDeviceId();
  cachedDeviceId = fresh;
  try {
    SecureStore.setItem(DEVICE_ID_KEY, fresh);
  } catch {
    // Non-fatal: a per-session id still works for rate limiting.
  }
  return fresh;
}

export interface ExtractionResult {
  brand: string | null;
  modelName: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  storeName: string | null;
  purchasePrice: number | null;
  currency: string | null;
  suggestedCategory: string | null;
  estimatedWarrantyMonths: number | null;
  warrantyAssumed: boolean;
  confidence: Record<string, "high" | "medium" | "low">;
}

export interface BarcodeProduct {
  brand: string | null;
  modelName: string | null;
  category: string | null;
  warrantyMonths: number | null;
}

export interface ClaimContactInfo {
  kind: "MANUFACTURER" | "RETAILER";
  name: string;
  displayName: string;
  email: string | null;
  url: string | null;
  phone: string | null;
  source: string;
  notes: string | null;
}

/** Fetch wrapper for the AI helper endpoints. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "x-device-id": deviceId(),
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed (${res.status})`);
  }
  return json as T;
}

/** React Native FormData file part from a local file URI. */
export function filePart(uri: string, name: string, type = "image/jpeg") {
  return { uri, name, type } as unknown as Blob;
}
