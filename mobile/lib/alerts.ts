import { vault, type VaultItemView } from "./vault";

/**
 * Expiry alerts are derived from the vault every time they're read, rather
 * than stored — with no server there is nothing to run a nightly job, and a
 * derived list can never go stale while the app sits unopened.
 */

export type AlertType = "EXPIRING_SOON" | "EXPIRED";

export interface VaultAlert {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  itemId: string;
  read: boolean;
  /** Sort key: fewer days remaining is more urgent. */
  daysRemaining: number;
}

/** Expired items stop being news after this long. */
const EXPIRED_GRACE_DAYS = 30;

function dateLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function listAlerts(): Promise<VaultAlert[]> {
  const [items, settings] = await Promise.all([
    vault.listItems(),
    vault.settings(),
  ]);
  const read = new Set(settings.readAlerts);
  const out: VaultAlert[] = [];

  for (const item of items) {
    if (item.archived) continue;
    const { status, daysRemaining } = item.warranty;
    const name = `${item.brand} ${item.modelName}`;

    if (status === "EXPIRING_SOON" && daysRemaining !== null) {
      const id = `${item.id}:EXPIRING_SOON`;
      out.push({
        id,
        type: "EXPIRING_SOON",
        title: `Warranty expiring: ${name}`,
        body: `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left — expires ${dateLabel(item.warrantyExpirationDate)}. If anything is wrong with it, claim now.`,
        itemId: item.id,
        read: read.has(id),
        daysRemaining,
      });
    } else if (
      status === "EXPIRED" &&
      daysRemaining !== null &&
      daysRemaining >= -EXPIRED_GRACE_DAYS
    ) {
      const id = `${item.id}:EXPIRED`;
      out.push({
        id,
        type: "EXPIRED",
        title: `Warranty expired: ${name}`,
        body: `Expired ${dateLabel(item.warrantyExpirationDate)}. Some retailers still honour faults reported shortly after expiry.`,
        itemId: item.id,
        read: read.has(id),
        daysRemaining,
      });
    }
  }

  return out.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export async function markAlertsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const settings = await vault.settings();
  const merged = new Set([...settings.readAlerts, ...ids]);
  await vault.saveSettings({ readAlerts: [...merged] });
}
