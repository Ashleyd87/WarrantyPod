import { NextRequest, NextResponse } from "next/server";

/**
 * The app stores its vault on the device and has no accounts, so the AI
 * helper endpoints can't authenticate a user. They instead accept an opaque
 * device id the app generates once and keeps in its secure storage.
 *
 * This is NOT an authorization boundary — it carries no identity and grants
 * access to nothing user-specific. It exists so per-caller rate limiting has
 * a key, keeping these endpoints from being trivially abused. Every route
 * using it must be safe to call by anyone: no stored user data is read or
 * written, only stateless lookups whose results are shared and non-personal.
 */

const DEVICE_HEADER = "x-device-id";
/** Opaque, app-generated: url-safe base64-ish, fixed length band. */
const DEVICE_ID_RE = /^[A-Za-z0-9_-]{16,128}$/;

export function getDeviceId(request: NextRequest): string | null {
  const raw = request.headers.get(DEVICE_HEADER)?.trim();
  if (!raw || !DEVICE_ID_RE.test(raw)) return null;
  return raw;
}

export function missingDevice() {
  return NextResponse.json(
    { error: "Missing or malformed device id" },
    { status: 400 }
  );
}
