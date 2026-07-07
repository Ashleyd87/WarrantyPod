import { NextRequest, NextResponse } from "next/server";
import { getApiUser, serializeItem, unauthorized } from "@/lib/api-helpers";
import { parseItemForm, type FormLike } from "@/lib/item-input";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings } from "@/lib/session";
import { deleteUpload } from "@/lib/storage";
import { computeExpirationDate } from "@/lib/warranty";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const settings = await getOrCreateSettings(user.id);
  const item = await prisma.productItem.findFirst({
    where: { id, userId: user.id },
    include: {
      assets: { orderBy: { createdAt: "asc" } },
      claims: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    item: serializeItem(item, settings.reminderLeadDays),
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const existing = await prisma.productItem.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = (await request.formData()) as unknown as FormLike;
  const parsed = parseItemForm(formData);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const warrantyExpirationDate =
    data.warrantyExpirationDate ??
    computeExpirationDate(data.purchaseDate, data.warrantyDurationMonths);

  const item = await prisma.productItem.update({
    where: { id },
    data: { ...data, warrantyExpirationDate },
    include: { assets: true, claims: true },
  });

  // Warranty dates may have changed — stale reminders must not survive.
  await prisma.notification.deleteMany({
    where: { productItemId: id, type: { in: ["EXPIRING_SOON", "EXPIRED"] } },
  });

  const settings = await getOrCreateSettings(user.id);
  return NextResponse.json({
    item: serializeItem(item, settings.reminderLeadDays),
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const item = await prisma.productItem.findFirst({
    where: { id, userId: user.id },
    include: { assets: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.productItem.delete({ where: { id } });
  for (const asset of item.assets) await deleteUpload(asset.fileKey);

  return NextResponse.json({ ok: true });
}
