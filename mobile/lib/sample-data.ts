import { vault } from "./vault";
import { computeExpirationDate } from "./warranty";

/**
 * Demo products so an empty vault can be explored without photographing
 * anything. Dates are relative to today so the statuses always read the same:
 * one expired, one expiring soon, the rest comfortably active.
 */

interface Sample {
  brand: string;
  modelName: string;
  category: string;
  serialNumber: string;
  storeName: string;
  purchasePrice: string;
  warrantyDurationMonths: number;
  /** Days from today until the warranty ends (negative = already expired). */
  expiresInDays: number;
}

const SAMPLES: Sample[] = [
  {
    brand: "Sony",
    modelName: "Bravia XR-55",
    category: "ELECTRONICS",
    serialNumber: "402KAZM8B334",
    storeName: "Best Buy",
    purchasePrice: "1299.00",
    warrantyDurationMonths: 24,
    expiresInDays: 21,
  },
  {
    brand: "LG",
    modelName: "C3 OLED 55\"",
    category: "ELECTRONICS",
    serialNumber: "311MXQL0P882",
    storeName: "Best Buy",
    purchasePrice: "1499.00",
    warrantyDurationMonths: 24,
    expiresInDays: 412,
  },
  {
    brand: "LG",
    modelName: "WM4000 washer",
    category: "APPLIANCE",
    serialNumber: "907KWWR1D204",
    storeName: "Home Depot",
    purchasePrice: "899.00",
    warrantyDurationMonths: 12,
    expiresInDays: 68,
  },
  {
    brand: "Dyson",
    modelName: "V15 Detect",
    category: "APPLIANCE",
    serialNumber: "JD5-UK-PBA1234A",
    storeName: "Amazon",
    purchasePrice: "649.00",
    warrantyDurationMonths: 24,
    expiresInDays: 300,
  },
  {
    brand: "DeWalt",
    modelName: "DCD709 drill",
    category: "TOOL",
    serialNumber: "2024-DCD709-8842",
    storeName: "Home Depot",
    purchasePrice: "179.00",
    warrantyDurationMonths: 36,
    expiresInDays: 720,
  },
  {
    brand: "Apple",
    modelName: "iPad Air 11\"",
    category: "ELECTRONICS",
    serialNumber: "DMPXK2LLHG7F",
    storeName: "Apple Store",
    purchasePrice: "599.00",
    warrantyDurationMonths: 12,
    expiresInDays: -35,
  },
];

function isoDaysFromNow(days: number): string {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + days)
  );
  return d.toISOString();
}

/** Adds the demo products. Refuses if the vault already has anything. */
export async function loadSampleProducts(): Promise<number> {
  const existing = await vault.listItems();
  if (existing.length > 0) return 0;

  for (const s of SAMPLES) {
    const expiry = isoDaysFromNow(s.expiresInDays);
    // Work the purchase date backwards from the expiry so the progress bar
    // reflects a plausible amount of elapsed cover.
    const purchase = isoDaysFromNow(
      s.expiresInDays - s.warrantyDurationMonths * 30
    );
    await vault.createItem({
      brand: s.brand,
      modelName: s.modelName,
      category: s.category,
      serialNumber: s.serialNumber,
      barcode: null,
      purchaseDate: purchase,
      purchasePrice: s.purchasePrice,
      currency: "USD",
      storeName: s.storeName,
      warrantyType: "MANUFACTURER",
      warrantyProvider: s.brand,
      warrantyDurationMonths: s.warrantyDurationMonths,
      warrantyExpirationDate:
        computeExpirationDate(purchase, s.warrantyDurationMonths) ?? expiry,
      warrantyAssumed: false,
      imageUrl: null,
      imageSource: null,
      imageCheckedAt: null,
      notes: null,
    });
  }
  return SAMPLES.length;
}
