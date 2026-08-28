import { NextRequest, NextResponse } from "next/server";
import { getDeviceId, missingDevice } from "@/lib/device-auth";
import { isMockMode } from "@/lib/extraction";
import { prisma } from "@/lib/prisma";
import { findProductImage } from "@/lib/product-image";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const LOOKUP_LIMIT = 12; // calls
const LOOKUP_WINDOW_MS = 60_000; // per minute per device
/** A miss isn't retried until this has passed. */
const RECHECK_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function cacheKey(brand: string, modelName: string): string {
  return `${brand}|${modelName}`.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * POST /api/product-image  { brand, modelName, category?, barcode? }
 * Finds an illustrative product photo for an item the user hasn't
 * photographed. Vault records live on the device, so the item is described
 * in the request rather than looked up; only the shared brand+model result
 * is cached here, which is not personal data.
 */
export async function POST(request: NextRequest) {
  const deviceId = getDeviceId(request);
  if (!deviceId) return missingDevice();

  let body: {
    brand?: string;
    modelName?: string;
    category?: string;
    barcode?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const brand = (body.brand ?? "").trim().slice(0, 120);
  const modelName = (body.modelName ?? "").trim().slice(0, 200);
  if (!brand && !modelName) {
    return NextResponse.json(
      { error: "Provide a brand and/or model" },
      { status: 400 }
    );
  }

  const key = cacheKey(brand, modelName);
  const cached = await prisma.productImage.findUnique({ where: { key } });
  if (cached) {
    const fresh = Date.now() - cached.checkedAt.getTime() < RECHECK_AFTER_MS;
    if (cached.imageUrl || fresh) {
      return NextResponse.json({
        imageUrl: cached.imageUrl,
        source: cached.source,
        cached: true,
      });
    }
  }

  if (isMockMode()) {
    return NextResponse.json({ imageUrl: null, source: "NONE", mock: true });
  }

  const limit = checkRateLimit(
    `product-image:${deviceId}`,
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
      brand,
      modelName,
      category: body.category ?? null,
      barcode: body.barcode ?? null,
    });
  } catch (e) {
    console.error(`Product image lookup failed for ${key}:`, e);
    // Don't record a miss — this was an outage, not an empty search.
    return NextResponse.json({ imageUrl: null, source: "NONE" });
  }

  await prisma.productImage.upsert({
    where: { key },
    update: {
      imageUrl: result.imageUrl,
      source: result.source,
      checkedAt: new Date(),
    },
    create: {
      key,
      brand,
      modelName,
      imageUrl: result.imageUrl,
      source: result.source,
    },
  });

  return NextResponse.json(result);
}
