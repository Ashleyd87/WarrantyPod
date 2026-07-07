import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { Asset, Claim, ProductItem } from "@prisma/client";
import { auth } from "./auth";
import { OPEN_CLAIM_STATUSES } from "./mappers";
import { getWarrantyInfo } from "./warranty";

/** Session guard for REST routes (mobile app). Returns the user or null. */
export async function getApiUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

type ItemWithRelations = ProductItem & {
  assets?: Asset[];
  claims?: Claim[];
};

/** JSON-safe item payload for the mobile app (dates ISO, decimals string). */
export function serializeItem(item: ItemWithRelations, leadDays: number) {
  return {
    id: item.id,
    brand: item.brand,
    modelName: item.modelName,
    category: item.category,
    serialNumber: item.serialNumber,
    purchaseDate: item.purchaseDate?.toISOString() ?? null,
    purchasePrice: item.purchasePrice?.toString() ?? null,
    currency: item.currency,
    storeName: item.storeName,
    warrantyType: item.warrantyType,
    warrantyProvider: item.warrantyProvider,
    warrantyDurationMonths: item.warrantyDurationMonths,
    warrantyExpirationDate: item.warrantyExpirationDate?.toISOString() ?? null,
    warrantyAssumed: item.warrantyAssumed,
    notes: item.notes,
    archived: item.archived,
    createdAt: item.createdAt.toISOString(),
    warranty: getWarrantyInfo(item, leadDays),
    hasReceipt: item.assets?.some((a) => a.type === "RECEIPT") ?? false,
    hasOpenClaim:
      item.claims?.some((c) => OPEN_CLAIM_STATUSES.includes(c.status)) ?? false,
    assets:
      item.assets?.map((a) => ({
        id: a.id,
        type: a.type,
        fileName: a.fileName,
        mimeType: a.mimeType,
      })) ?? [],
    claims:
      item.claims?.map((c) => ({
        id: c.id,
        status: c.status,
        claimNumber: c.claimNumber,
        providerContact: c.providerContact,
        issueDescription: c.issueDescription,
        submittedAt: c.submittedAt?.toISOString() ?? null,
        resolvedAt: c.resolvedAt?.toISOString() ?? null,
        resolutionNotes: c.resolutionNotes,
        createdAt: c.createdAt.toISOString(),
      })) ?? [],
  };
}

export type SerializedItem = ReturnType<typeof serializeItem>;
