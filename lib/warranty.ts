// All warranty dates are calendar dates stored as UTC midnight. Every
// calculation here works on UTC date components so results never shift a
// day depending on the server/browser timezone.

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

/** Calendar-date key (ms at UTC midnight) from a stored UTC-midnight date. */
function utcDateKey(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** The user's local calendar date, as a UTC key for comparison. */
function todayKey(): number {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Adds calendar months in UTC, clamping the day (Jan 31 + 1mo = Feb 28). */
export function computeExpirationDate(
  purchaseDate: Date | null,
  durationMonths: number | null
): Date | null {
  if (!purchaseDate || durationMonths === null || durationMonths <= 0)
    return null;
  const d = new Date(utcDateKey(purchaseDate));
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + durationMonths);
  const daysInMonth = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(day, daysInMonth));
  return d;
}

/**
 * Warranty status is always derived at read time from the expiration date —
 * never stored — so it can't go stale.
 */
export function getWarrantyInfo(
  item: {
    purchaseDate: Date | null;
    warrantyExpirationDate: Date | null;
  },
  leadDays: number
): WarrantyInfo {
  const exp = item.warrantyExpirationDate;
  if (!exp)
    return { status: "NO_WARRANTY", daysRemaining: null, fractionElapsed: null };

  const today = todayKey();
  const daysRemaining = Math.round((utcDateKey(exp) - today) / DAY_MS);

  let fractionElapsed: number | null = null;
  if (item.purchaseDate) {
    const total = (utcDateKey(exp) - utcDateKey(item.purchaseDate)) / DAY_MS;
    if (total > 0) {
      const elapsed = (today - utcDateKey(item.purchaseDate)) / DAY_MS;
      fractionElapsed = Math.min(1, Math.max(0, elapsed / total));
    }
  }

  if (daysRemaining < 0)
    return { status: "EXPIRED", daysRemaining, fractionElapsed: 1 };
  if (daysRemaining <= leadDays)
    return { status: "EXPIRING_SOON", daysRemaining, fractionElapsed };
  return { status: "ACTIVE", daysRemaining, fractionElapsed };
}

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
  NO_WARRANTY: "No warranty info",
};
