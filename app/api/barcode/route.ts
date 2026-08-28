import { NextRequest, NextResponse } from "next/server";
import { getDeviceId, missingDevice } from "@/lib/device-auth";
import { isProductBarcode, lookupBarcode } from "@/lib/barcode-lookup";
import { isMockMode } from "@/lib/extraction";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const LIMIT = 15; // lookups
const WINDOW_MS = 60_000; // per minute per user

/**
 * GET /api/barcode?code=0123456789012
 * Identifies a product from a scanned UPC/EAN so the add form can arrive
 * pre-filled. Returns product:null when the code isn't a product barcode
 * (e.g. a Code128 service label) or nothing was found.
 */
export async function GET(request: NextRequest) {
  const deviceId = getDeviceId(request);
  if (!deviceId) return missingDevice();

  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  if (!code) {
    return NextResponse.json({ error: "Provide a barcode" }, { status: 400 });
  }
  if (!isProductBarcode(code)) {
    // Not a product code — the caller keeps it as a serial candidate.
    return NextResponse.json({ product: null, reason: "not-a-product-barcode" });
  }

  const limit = checkRateLimit(`barcode:${deviceId}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many lookups — try again in ${limit.retryAfterSeconds}s` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const result = await lookupBarcode(code);
    return NextResponse.json({
      product: result?.product ?? null,
      cached: result?.cached ?? false,
      mock: isMockMode(),
    });
  } catch (e) {
    console.error(`Barcode lookup failed for ${code}:`, e);
    return NextResponse.json({ product: null });
  }
}
