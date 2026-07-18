import { authClient } from "./auth-client";
import { API_URL } from "./config";

export interface WarrantyInfo {
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NO_WARRANTY";
  daysRemaining: number | null;
  fractionElapsed: number | null;
}

export interface ApiAsset {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
}

export interface ApiClaim {
  id: string;
  status: string;
  claimNumber: string | null;
  providerContact: string | null;
  issueDescription: string;
  submittedAt: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

export interface ApiItem {
  id: string;
  brand: string;
  modelName: string;
  category: string;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchasePrice: string | null;
  currency: string;
  storeName: string | null;
  warrantyType: string;
  warrantyProvider: string | null;
  warrantyDurationMonths: number | null;
  warrantyExpirationDate: string | null;
  warrantyAssumed: boolean;
  notes: string | null;
  archived: boolean;
  createdAt: string;
  warranty: WarrantyInfo;
  hasReceipt: boolean;
  hasOpenClaim: boolean;
  assets: ApiAsset[];
  claims: ApiClaim[];
}

export interface ApiSettings {
  reminderLeadDays: number;
  currency: string;
  theme?: string;
}

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  productItemId: string;
  createdAt: string;
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

export function authHeaders(): Record<string, string> {
  const cookie = authClient.getCookie();
  return cookie ? { Cookie: cookie } : {};
}

export function fileUrl(assetId: string) {
  return `${API_URL}/api/files/${assetId}`;
}

/** Fetch wrapper: attaches the session cookie, raises on error payloads. */
export async function api<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
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

export async function apiRaw(path: string): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res;
}

/** React Native FormData file part from a local file URI. */
export function filePart(uri: string, name: string, type = "image/jpeg") {
  return { uri, name, type } as unknown as Blob;
}
