"use server";

import { revalidatePath } from "next/cache";
import {
  claimStatusTimestamps as statusTimestamps,
  type FormLike,
} from "@/lib/item-input";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { claimSchema } from "@/lib/validators";
import type { ActionResult } from "./items";

export async function createClaim(
  itemId: string,
  formData: FormLike
): Promise<ActionResult> {
  const user = await requireUser();
  const item = await prisma.productItem.findFirst({
    where: { id: itemId, userId: user.id },
  });
  if (!item) return { error: "Item not found" };

  const parsed = claimSchema.safeParse({
    issueDescription: formData.get("issueDescription"),
    claimNumber: formData.get("claimNumber"),
    providerContact: formData.get("providerContact"),
    status: formData.get("status") || "DRAFT",
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const ts = statusTimestamps(parsed.data.status);
  await prisma.claim.create({
    data: {
      productItemId: itemId,
      ...parsed.data,
      submittedAt: ts.submittedAt,
      resolvedAt: ts.resolvedAt,
    },
  });

  revalidatePath(`/vault/${itemId}`);
  revalidatePath("/vault");
  revalidatePath("/");
}

export async function updateClaim(
  claimId: string,
  formData: FormLike
): Promise<ActionResult> {
  const user = await requireUser();
  const claim = await prisma.claim.findFirst({
    where: { id: claimId, productItem: { userId: user.id } },
    include: { productItem: true },
  });
  if (!claim) return { error: "Claim not found" };

  const parsed = claimSchema.safeParse({
    issueDescription: formData.get("issueDescription"),
    claimNumber: formData.get("claimNumber"),
    providerContact: formData.get("providerContact"),
    status: formData.get("status") || claim.status,
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const statusChanged = parsed.data.status !== claim.status;
  const ts = statusTimestamps(parsed.data.status);

  await prisma.claim.update({
    where: { id: claimId },
    data: {
      ...parsed.data,
      submittedAt: claim.submittedAt ?? ts.submittedAt,
      resolvedAt: ts.resolvedAt ? (claim.resolvedAt ?? ts.resolvedAt) : null,
      resolutionNotes: (formData.get("resolutionNotes") as string) || null,
    },
  });

  if (statusChanged) {
    await prisma.notification.upsert({
      where: {
        userId_productItemId_type: {
          userId: user.id,
          productItemId: claim.productItemId,
          type: "CLAIM_UPDATE",
        },
      },
      update: {
        title: `Claim ${parsed.data.status.toLowerCase().replace("_", " ")}: ${claim.productItem.brand} ${claim.productItem.modelName}`,
        body: `Claim status updated to ${parsed.data.status.replace("_", " ").toLowerCase()}.`,
        readAt: null,
      },
      create: {
        userId: user.id,
        productItemId: claim.productItemId,
        type: "CLAIM_UPDATE",
        title: `Claim ${parsed.data.status.toLowerCase().replace("_", " ")}: ${claim.productItem.brand} ${claim.productItem.modelName}`,
        body: `Claim status updated to ${parsed.data.status.replace("_", " ").toLowerCase()}.`,
      },
    });
  }

  revalidatePath(`/vault/${claim.productItemId}`);
  revalidatePath("/vault");
  revalidatePath("/");
}

export async function deleteClaim(claimId: string): Promise<ActionResult> {
  const user = await requireUser();
  const claim = await prisma.claim.findFirst({
    where: { id: claimId, productItem: { userId: user.id } },
  });
  if (!claim) return { error: "Claim not found" };

  await prisma.claim.delete({ where: { id: claimId } });
  revalidatePath(`/vault/${claim.productItemId}`);
}
