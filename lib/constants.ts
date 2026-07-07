export const CATEGORIES = [
  "APPLIANCE",
  "ELECTRONICS",
  "FURNITURE",
  "TOOL",
  "JEWELRY",
  "VEHICLE",
  "SPORTS",
  "OTHER",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  APPLIANCE: "Appliance",
  ELECTRONICS: "Electronics",
  FURNITURE: "Furniture",
  TOOL: "Tools",
  JEWELRY: "Jewelry & Watches",
  VEHICLE: "Vehicle",
  SPORTS: "Sports & Outdoors",
  OTHER: "Other",
};

export const WARRANTY_TYPES = [
  "MANUFACTURER",
  "RETAILER",
  "EXTENDED",
  "CREDIT_CARD",
  "OTHER",
] as const;
export type WarrantyType = (typeof WARRANTY_TYPES)[number];

export const WARRANTY_TYPE_LABELS: Record<WarrantyType, string> = {
  MANUFACTURER: "Manufacturer",
  RETAILER: "Retailer / Store",
  EXTENDED: "Extended plan",
  CREDIT_CARD: "Credit card benefit",
  OTHER: "Other",
};

export const ASSET_TYPES = [
  "RECEIPT",
  "SERIAL_STICKER",
  "WARRANTY_CARD",
  "PRODUCT_PHOTO",
  "MANUAL",
  "OTHER",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  RECEIPT: "Receipt",
  SERIAL_STICKER: "Serial / barcode sticker",
  WARRANTY_CARD: "Warranty card",
  PRODUCT_PHOTO: "Product photo",
  MANUAL: "Manual",
  OTHER: "Other",
};

export const CLAIM_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "APPROVED",
  "DENIED",
  "RESOLVED",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  DENIED: "Denied",
  RESOLVED: "Resolved",
};

export const REMINDER_LEAD_OPTIONS = [7, 14, 30, 60, 90] as const;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
