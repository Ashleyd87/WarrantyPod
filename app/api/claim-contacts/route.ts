import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-helpers";
import { lookupClaimContact } from "@/lib/claim-contacts";
import { isMockMode } from "@/lib/extraction";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const LOOKUP_LIMIT = 10; // calls
const LOOKUP_WINDOW_MS = 60_000; // per minute per user

/**
 * GET /api/claim-contacts?brand=LG&store=Best+Buy
 * Resolves where a warranty claim should be sent for the item's manufacturer
 * and (optionally) retailer. Cached lookups return instantly; unknown names
 * trigger an AI web-search when an Anthropic key is configured.
 */
export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const brand = request.nextUrl.searchParams.get("brand")?.trim() ?? "";
  const store = request.nextUrl.searchParams.get("store")?.trim() ?? "";
  if (!brand && !store) {
    return NextResponse.json(
      { error: "Provide a brand and/or store to look up" },
      { status: 400 }
    );
  }

  const limit = checkRateLimit(
    `contacts:${user.id}`,
    LOOKUP_LIMIT,
    LOOKUP_WINDOW_MS
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many lookups — try again in ${limit.retryAfterSeconds}s` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const [manufacturer, retailer] = await Promise.all([
    brand ? lookupClaimContact("MANUFACTURER", brand) : Promise.resolve(null),
    store ? lookupClaimContact("RETAILER", store) : Promise.resolve(null),
  ]);

  return NextResponse.json({ manufacturer, retailer, mock: isMockMode() });
}
