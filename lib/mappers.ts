import type { Asset, Claim, Prisma, ProductItem } from "@prisma/client";
import type { ItemCardData } from "@/components/items/item-card";
import { getWarrantyInfo } from "./warranty";

export const OPEN_CLAIM_STATUSES = ["DRAFT", "SUBMITTED", "IN_REVIEW"];

type ItemWithRelations = ProductItem & {
  assets: Pick<Asset, "type">[];
  claims: Pick<Claim, "status">[];
};

export function toItemCardData(
  item: ItemWithRelations,
  leadDays: number
): ItemCardData {
  return {
    id: item.id,
    brand: item.brand,
    modelName: item.modelName,
    category: item.category,
    serialNumber: item.serialNumber,
    purchaseDate: item.purchaseDate,
    purchasePrice: decimalToString(item.purchasePrice),
    currency: item.currency,
    archived: item.archived,
    hasReceipt: item.assets.some((a) => a.type === "RECEIPT"),
    hasOpenClaim: item.claims.some((c) => OPEN_CLAIM_STATUSES.includes(c.status)),
    warranty: getWarrantyInfo(item, leadDays),
  };
}

export function decimalToString(value: Prisma.Decimal | null): string | null {
  return value === null ? null : value.toString();
}
