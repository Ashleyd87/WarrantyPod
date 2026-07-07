import { NextRequest, NextResponse } from "next/server";
import { getApiUser, serializeItem, unauthorized } from "@/lib/api-helpers";
import { collectAssets, parseItemForm, type FormLike } from "@/lib/item-input";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings } from "@/lib/session";
import { saveUpload } from "@/lib/storage";
import { computeExpirationDate } from "@/lib/warranty";

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const settings = await getOrCreateSettings(user.id);
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const category = request.nextUrl.searchParams.get("category") ?? "";

  const items = await prisma.productItem.findMany({
    where: {
      userId: user.id,
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { brand: { contains: q, mode: "insensitive" as const } },
              { modelName: { contains: q, mode: "insensitive" as const } },
              { serialNumber: { contains: q, mode: "insensitive" as const } },
              { storeName: { contains: q, mode: "insensitive" as const } },
              { notes: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: { assets: true, claims: true },
    orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    items: items.map((i) => serializeItem(i, settings.reminderLeadDays)),
    settings: {
      reminderLeadDays: settings.reminderLeadDays,
      currency: settings.currency,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const formData = (await request.formData()) as unknown as FormLike;
  const parsed = parseItemForm(formData);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  let assets;
  try {
    assets = await collectAssets(formData);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 }
    );
  }

  const warrantyExpirationDate =
    data.warrantyExpirationDate ??
    computeExpirationDate(data.purchaseDate, data.warrantyDurationMonths);

  const saved: { key: string; asset: { file: File; type: string } }[] = [];
  for (const a of assets) {
    saved.push({ key: await saveUpload(user.id, a.file), asset: a });
  }

  const settings = await getOrCreateSettings(user.id);
  const item = await prisma.productItem.create({
    data: {
      userId: user.id,
      ...data,
      warrantyExpirationDate,
      assets: {
        create: saved.map(({ key, asset }) => ({
          type: asset.type,
          fileKey: key,
          fileName: asset.file.name,
          mimeType: asset.file.type,
          sizeBytes: asset.file.size,
        })),
      },
    },
    include: { assets: true, claims: true },
  });

  return NextResponse.json(
    { item: serializeItem(item, settings.reminderLeadDays) },
    { status: 201 }
  );
}
