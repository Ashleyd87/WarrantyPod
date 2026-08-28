// Warranty maths, computed on-device. Ported from the server's lib/warranty.ts
// so results are identical; dates are ISO strings here rather than Date rows.
//
// All warranty dates are calendar dates stored as UTC midnight. Every
// calculation works on UTC date components so results never shift a day
// depending on the device timezone.

export type WarrantyStatus =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "NO_WARRANTY";

export interface WarrantyInfo {
  status: WarrantyStatus;
  daysRemaining: number | null;
  /** 0..1 fraction of the warranty period elapsed, when computable. */
  fractionElapsed: number | null;
}

const DAY_MS = 86_400_000;

function utcDateKey(iso: string): number {
  const d = new Date(iso);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** The user's local calendar date, as a UTC key for comparison. */
function todayKey(): number {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Adds calendar months in UTC, clamping the day (Jan 31 + 1mo = Feb 28). */
export function computeExpirationDate(
  purchaseDate: string | null,
  durationMonths: number | null
): string | null {
  if (!purchaseDate || durationMonths === null || durationMonths <= 0) {
    return null;
  }
  const d = new Date(utcDateKey(purchaseDate));
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + durationMonths);
  const daysInMonth = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(day, daysInMonth));
  return d.toISOString();
}

/**
 * Status is always derived at read time from the expiration date — never
 * stored — so it can't go stale while the app sits unopened.
 */
export function getWarrantyInfo(
  item: { purchaseDate: string | null; warrantyExpirationDate: string | null },
  leadDays: number
): WarrantyInfo {
  const exp = item.warrantyExpirationDate;
  if (!exp) {
    return { status: "NO_WARRANTY", daysRemaining: null, fractionElapsed: null };
  }

  const today = todayKey();
  const expKey = utcDateKey(exp);
  const daysRemaining = Math.round((expKey - today) / DAY_MS);

  let fractionElapsed: number | null = null;
  if (item.purchaseDate) {
    const startKey = utcDateKey(item.purchaseDate);
    const total = (expKey - startKey) / DAY_MS;
    if (total > 0) {
      const elapsed = (today - startKey) / DAY_MS;
      fractionElapsed = Math.min(1, Math.max(0, elapsed / total));
    }
  }

  if (daysRemaining < 0) {
    return { status: "EXPIRED", daysRemaining, fractionElapsed: 1 };
  }
  if (daysRemaining <= leadDays) {
    return { status: "EXPIRING_SOON", daysRemaining, fractionElapsed };
  }
  return { status: "ACTIVE", daysRemaining, fractionElapsed };
}

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
  NO_WARRANTY: "No warranty info",
};
