// Shared FormData parsing for product items — used by both the web server
// actions and the mobile REST API so validation can never drift apart.
import { ASSET_TYPES } from "./constants";
import { validateImageFile } from "./storage";
import { productItemSchema } from "./validators";

export const ITEM_FIELDS = [
  "brand",
  "modelName",
  "category",
  "serialNumber",
  "purchaseDate",
  "purchasePrice",
  "currency",
  "storeName",
  "warrantyType",
  "warrantyProvider",
  "warrantyDurationMonths",
  "warrantyExpirationDate",
  "warrantyAssumed",
  "notes",
] as const;

// Structural stand-in for FormData. The global FormData type resolves
// inconsistently across our dependency tree (undici vs DOM), so helpers accept
// this instead and call sites cast with `as unknown as FormLike`. The real
// WHATWG FormData passed at runtime always provides get/getAll.
export type FormLike = {
  get(name: string): unknown;
  getAll(name: string): unknown[];
};

export function parseItemForm(formData: FormLike) {
  const raw = Object.fromEntries(
    ITEM_FIELDS.map((k) => [k, formData.get(k)])
  ) as Record<string, unknown>;
  raw.warrantyAssumed = raw.warrantyAssumed === "true" ? "true" : "";
  return productItemSchema.safeParse(raw);
}

export async function collectAssets(formData: FormLike) {
  const files = formData.getAll("assetFile") as unknown as File[];
  const types = formData.getAll("assetType") as unknown as string[];
  const assets: { file: File; type: string }[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!(file instanceof File) || file.size === 0) continue;
    const type = ASSET_TYPES.includes(types[i] as never) ? types[i] : "OTHER";
    const problem = validateImageFile(file);
    if (problem) throw new Error(`${file.name}: ${problem}`);
    assets.push({ file, type });
  }
  return assets;
}

/** Timestamps implied by a claim status transition. */
export function claimStatusTimestamps(status: string) {
  return {
    submittedAt: ["SUBMITTED", "IN_REVIEW", "APPROVED", "DENIED", "RESOLVED"].includes(
      status
    )
      ? new Date()
      : null,
    resolvedAt: ["RESOLVED", "APPROVED", "DENIED"].includes(status)
      ? new Date()
      : null,
  };
}
