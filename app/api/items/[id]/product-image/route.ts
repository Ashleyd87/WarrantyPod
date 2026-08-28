import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-helpers";
import { isMockMode } from "@/lib/extraction";
import { prisma } from "@/lib/prisma";
import { findProductImage } from "@/lib/product-image";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const LOOKUP_LIMIT = 12; // calls
const LOOKUP_WINDOW_MS = 60_000; // per minute per user
/** A miss isn't retried until this has passed. */
const RECHECK_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/items/[id]/product-image
 * Finds an illustrative product photo for an item that has no user photo.
 * Idempotent and cheap to call: returns the stored result unless the item
 * has never been looked up (or the last look was a miss over a week ago).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const item = await prisma.productItem.findFirst({
    where: { id, userId: user.id },
    include: { assets: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // A real photo the user took always wins — never spend a lookup.
  const hasOwnPhoto = item.assets.some(
    (a) => a.type === "PRODUCT_PHOTO" && a.mimeType.startsWith("image/")
  );
  if (hasOwnPhoto) {
    return NextResponse.json({ imageUrl: null, source: "USER" });
  }

  const checkedAt = item.imageCheckedAt?.getTime() ?? 0;
  const isFresh = Date.now() - checkedAt < RECHECK_AFTER_MS;
  if (item.imageUrl || (item.imageSource === "NONE" && isFresh)) {
    return NextResponse.json({
      imageUrl: item.imageUrl,
      source: item.imageSource ?? "NONE",
      cached: true,
    });
  }

  if (isMockMode()) {
    return NextResponse.json({ imageUrl: null, source: "NONE", mock: true });
  }

  const limit = checkRateLimit(
    `product-image:${user.id}`,
    LOOKUP_LIMIT,
    LOOKUP_WINDOW_MS
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many lookups — try again in ${limit.retryAfterSeconds}s` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let result: { imageUrl: string | null; source: "WEB" | "NONE" };
  try {
    result = await findProductImage({
      brand: item.brand,
      modelName: item.modelName,
      category: item.category,
      barcode: item.barcode,
    });
  } catch (e) {
    console.error(`Product image lookup failed for ${item.id}:`, e);
    // Don't record a miss — this was an outage, not an empty search.
    return NextResponse.json({ imageUrl: null, source: "NONE" });
  }

  await prisma.productItem.update({
    where: { id: item.id },
    data: {
      imageUrl: result.imageUrl,
      imageSource: result.source,
      imageCheckedAt: new Date(),
    },
  });

  return NextResponse.json(result);
}
