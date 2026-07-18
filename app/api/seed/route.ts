import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import {
  SAMPLE_ITEMS,
  dateFromNow,
  purchaseDateFor,
} from "@/lib/sample-data";

/**
 * Populates a few realistic sample products for the signed-in user — but only
 * when their vault is empty, so it's safe to call from an empty-state button
 * without ever creating duplicates.
 */
export async function POST() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const existing = await prisma.productItem.count({ where: { userId: user.id } });
  if (existing > 0) {
    return NextResponse.json({ added: 0, reason: "vault-not-empty" });
  }

  const data = SAMPLE_ITEMS.map((s) => {
    const warrantyExpirationDate = dateFromNow(s.daysUntilExpiry);
    const purchaseDate = purchaseDateFor(
      warrantyExpirationDate,
      s.warrantyDurationMonths
    );
    return {
      userId: user.id,
      brand: s.brand,
      modelName: s.modelName,
      category: s.category,
      serialNumber: s.serialNumber,
      purchaseDate,
      purchasePrice: s.purchasePrice,
      currency: s.currency,
      storeName: s.storeName,
      warrantyType: s.warrantyType,
      warrantyProvider: s.warrantyProvider,
      warrantyDurationMonths: s.warrantyDurationMonths,
      warrantyExpirationDate,
      warrantyAssumed: false,
      notes: s.notes ?? null,
    };
  });

  await prisma.productItem.createMany({ data });
  return NextResponse.json({ added: data.length });
}
