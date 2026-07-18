// Sample vault contents used to seed a new account so the app isn't empty.
// Dates are computed relative to "now" at seed time so countdowns look right.

export interface SampleItem {
  brand: string;
  modelName: string;
  category: string;
  serialNumber: string;
  storeName: string;
  purchasePrice: number;
  currency: string;
  warrantyType: string;
  warrantyProvider: string;
  warrantyDurationMonths: number;
  /** Days from now until the warranty ends (negative = already expired). */
  daysUntilExpiry: number;
  notes?: string;
}

export const SAMPLE_ITEMS: SampleItem[] = [
  {
    brand: "Sony",
    modelName: "Bravia XR-55",
    category: "ELECTRONICS",
    serialNumber: "SB55XR-8H24-99401",
    storeName: "Best Buy",
    purchasePrice: 1199.0,
    currency: "USD",
    warrantyType: "MANUFACTURER",
    warrantyProvider: "Sony",
    warrantyDurationMonths: 24,
    daysUntilExpiry: 21,
    notes: "Living room. Extended protection plan receipt in the drawer.",
  },
  {
    brand: "LG",
    modelName: 'C3 OLED 55"',
    category: "ELECTRONICS",
    serialNumber: "402KAZM8B334",
    storeName: "Best Buy",
    purchasePrice: 1299.0,
    currency: "USD",
    warrantyType: "EXTENDED",
    warrantyProvider: "LG + store extension",
    warrantyDurationMonths: 24,
    daysUntilExpiry: 412,
  },
  {
    brand: "LG",
    modelName: "WM4000 Washer",
    category: "APPLIANCE",
    serialNumber: "WM4K-7712-AA31",
    storeName: "Home Depot",
    purchasePrice: 899.0,
    currency: "USD",
    warrantyType: "MANUFACTURER",
    warrantyProvider: "LG",
    warrantyDurationMonths: 12,
    daysUntilExpiry: 68,
  },
  {
    brand: "Dyson",
    modelName: "V15 Detect",
    category: "APPLIANCE",
    serialNumber: "DV15-2026-K88Q",
    storeName: "Dyson.com",
    purchasePrice: 749.0,
    currency: "USD",
    warrantyType: "MANUFACTURER",
    warrantyProvider: "Dyson",
    warrantyDurationMonths: 24,
    daysUntilExpiry: 300,
  },
  {
    brand: "DeWalt",
    modelName: "DCD771 Drill",
    category: "TOOL",
    serialNumber: "DW771-556-1180",
    storeName: "Lowe's",
    purchasePrice: 99.0,
    currency: "USD",
    warrantyType: "MANUFACTURER",
    warrantyProvider: "DeWalt",
    warrantyDurationMonths: 36,
    daysUntilExpiry: 720,
  },
  {
    brand: "Apple",
    modelName: "iPad Air (5th gen)",
    category: "ELECTRONICS",
    serialNumber: "F2LW-9931-Q7X2",
    storeName: "Apple Store",
    purchasePrice: 599.0,
    currency: "USD",
    warrantyType: "MANUFACTURER",
    warrantyProvider: "Apple",
    warrantyDurationMonths: 12,
    daysUntilExpiry: -35,
    notes: "Out of warranty — kept for records / insurance.",
  },
];

/** UTC calendar date `days` from today (matches how the app stores dates). */
export function dateFromNow(days: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days)
  );
}

/** Purchase date = expiry minus the warranty duration, in UTC. */
export function purchaseDateFor(expiry: Date, months: number): Date {
  const d = new Date(expiry);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}
