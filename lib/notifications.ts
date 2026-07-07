import { formatDate } from "./utils";
import { getWarrantyInfo } from "./warranty";
import { prisma } from "./prisma";

/**
 * Generates in-app reminder notifications for warranties entering the user's
 * lead window or expiring. Called on app-shell load — idempotent thanks to
 * the (userId, productItemId, type) unique constraint. v1 is in-app only;
 * email/push notifications are on the v2 roadmap.
 */
export async function syncNotifications(userId: string, leadDays: number) {
  const items = await prisma.productItem.findMany({
    where: {
      userId,
      archived: false,
      warrantyExpirationDate: { not: null },
    },
    select: {
      id: true,
      brand: true,
      modelName: true,
      purchaseDate: true,
      warrantyExpirationDate: true,
    },
  });

  for (const item of items) {
    const info = getWarrantyInfo(item, leadDays);
    const name = `${item.brand} ${item.modelName}`;

    if (info.status === "EXPIRING_SOON") {
      await upsertNotification(userId, item.id, "EXPIRING_SOON", {
        title: `Warranty expiring: ${name}`,
        body: `${info.daysRemaining} day${info.daysRemaining === 1 ? "" : "s"} left — expires ${formatDate(item.warrantyExpirationDate)}. If anything is wrong with it, claim now.`,
      });
    } else if (info.status === "EXPIRED" && (info.daysRemaining ?? 0) >= -30) {
      // Only notify for recently expired items, not ancient history.
      await upsertNotification(userId, item.id, "EXPIRED", {
        title: `Warranty expired: ${name}`,
        body: `Expired ${formatDate(item.warrantyExpirationDate)}. Some retailers honour claims for faults reported shortly after expiry.`,
      });
    }
  }
}

async function upsertNotification(
  userId: string,
  productItemId: string,
  type: string,
  data: { title: string; body: string }
) {
  await prisma.notification.upsert({
    where: {
      userId_productItemId_type: { userId, productItemId, type },
    },
    // Keep existing read state; refresh the body text.
    update: { title: data.title, body: data.body },
    create: { userId, productItemId, type, ...data },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
