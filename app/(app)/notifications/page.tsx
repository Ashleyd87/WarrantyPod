import Link from "next/link";
import { AlertTriangle, BellOff, FileCheck, TimerOff } from "lucide-react";
import { MarkAllReadButton, NotificationRow } from "@/components/notifications/notification-list";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Alerts" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            {unread ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <BellOff className="size-8 text-muted-foreground" />
            <p className="font-semibold">No alerts</p>
            <p className="text-sm text-muted-foreground">
              You&apos;ll be notified here before warranties expire. Set your
              lead time in{" "}
              <Link href="/settings" className="text-primary hover:underline">
                Settings
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={{
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                read: Boolean(n.readAt),
                productItemId: n.productItemId,
                createdAt: n.createdAt.toISOString(),
              }}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
        <div className="rounded-lg bg-secondary p-2">
          <AlertTriangle className="mx-auto mb-1 size-4 text-warning" />
          Expiring soon
        </div>
        <div className="rounded-lg bg-secondary p-2">
          <TimerOff className="mx-auto mb-1 size-4 text-destructive" />
          Recently expired
        </div>
        <div className="rounded-lg bg-secondary p-2">
          <FileCheck className="mx-auto mb-1 size-4 text-primary" />
          Claim updates
        </div>
      </div>
    </div>
  );
}
