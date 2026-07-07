"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { collectAssets, parseItemForm, type FormLike } from "@/lib/item-input";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { deleteUpload, saveUpload } from "@/lib/storage";
import { computeExpirationDate } from "@/lib/warranty";

export type ActionResult = { error?: string } | void;

export async function createItem(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = parseItemForm(formData as unknown as FormLike);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  let assets;
  try {
    assets = await collectAssets(formData as unknown as FormLike);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }

  const warrantyExpirationDate =
    data.warrantyExpirationDate ??
    computeExpirationDate(data.purchaseDate, data.warrantyDurationMonths);

  const savedKeys: { key: string; asset: { file: File; type: string } }[] = [];
  for (const a of assets) {
    savedKeys.push({ key: await saveUpload(user.id, a.file), asset: a });
  }

  const item = await prisma.productItem.create({
    data: {
      userId: user.id,
      ...data,
      warrantyExpirationDate,
      assets: {
        create: savedKeys.map(({ key, asset }) => ({
          type: asset.type,
          fileKey: key,
          fileName: asset.file.name,
          mimeType: asset.file.type,
          sizeBytes: asset.file.size,
        })),
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/vault");
  redirect(`/vault/${item.id}`);
}

export async function updateItem(
  itemId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.productItem.findFirst({
    where: { id: itemId, userId: user.id },
  });
  if (!existing) return { error: "Item not found" };

  const parsed = parseItemForm(formData as unknown as FormLike);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const warrantyExpirationDate =
    data.warrantyExpirationDate ??
    computeExpirationDate(data.purchaseDate, data.warrantyDurationMonths);

  await prisma.productItem.update({
    where: { id: itemId },
    data: { ...data, warrantyExpirationDate },
  });

  // Warranty dates may have changed — stale reminders must not survive.
  await prisma.notification.deleteMany({
    where: {
      productItemId: itemId,
      type: { in: ["EXPIRING_SOON", "EXPIRED"] },
    },
  });

  revalidatePath("/");
  revalidatePath("/vault");
  revalidatePath(`/vault/${itemId}`);
  redirect(`/vault/${itemId}`);
}

export async function deleteItem(itemId: string): Promise<ActionResult> {
  const user = await requireUser();
  const item = await prisma.productItem.findFirst({
    where: { id: itemId, userId: user.id },
    include: { assets: true },
  });
  if (!item) return { error: "Item not found" };

  await prisma.productItem.delete({ where: { id: itemId } });
  for (const asset of item.assets) await deleteUpload(asset.fileKey);

  revalidatePath("/");
  revalidatePath("/vault");
  redirect("/vault");
}

export async function toggleArchiveItem(itemId: string): Promise<ActionResult> {
  const user = await requireUser();
  const item = await prisma.productItem.findFirst({
    where: { id: itemId, userId: user.id },
  });
  if (!item) return { error: "Item not found" };

  await prisma.productItem.update({
    where: { id: itemId },
    data: { archived: !item.archived },
  });
  revalidatePath("/vault");
  revalidatePath(`/vault/${itemId}`);
}

export async function addAsset(
  itemId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const item = await prisma.productItem.findFirst({
    where: { id: itemId, userId: user.id },
  });
  if (!item) return { error: "Item not found" };

  let assets;
  try {
    assets = await collectAssets(formData as unknown as FormLike);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
  if (assets.length === 0) return { error: "Choose a file to upload" };

  for (const a of assets) {
    const key = await saveUpload(user.id, a.file);
    await prisma.asset.create({
      data: {
        productItemId: itemId,
        type: a.type,
        fileKey: key,
        fileName: a.file.name,
        mimeType: a.file.type,
        sizeBytes: a.file.size,
      },
    });
  }
  revalidatePath(`/vault/${itemId}`);
}

export async function deleteAsset(assetId: string): Promise<ActionResult> {
  const user = await requireUser();
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, productItem: { userId: user.id } },
  });
  if (!asset) return { error: "Attachment not found" };

  await prisma.asset.delete({ where: { id: assetId } });
  await deleteUpload(asset.fileKey);
  revalidatePath(`/vault/${asset.productItemId}`);
}
