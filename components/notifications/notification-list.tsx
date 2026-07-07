"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertTriangle, CheckCheck, FileCheck, TimerOff } from "lucide-react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/misc";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsRead();
        })
      }
    >
      <CheckCheck /> Mark all read
    </Button>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  EXPIRING_SOON: <AlertTriangle className="size-4 text-warning" />,
  EXPIRED: <TimerOff className="size-4 text-destructive" />,
  CLAIM_UPDATE: <FileCheck className="size-4 text-primary" />,
};

export function NotificationRow({
  notification,
}: {
  notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    read: boolean;
    productItemId: string;
    createdAt: string;
  };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <button
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent/40",
        notification.read
          ? "border-border bg-card opacity-70"
          : "border-primary/30 bg-card"
      )}
      onClick={() => {
        startTransition(async () => {
          if (!notification.read) await markNotificationRead(notification.id);
          router.push(`/vault/${notification.productItemId}`);
        });
      }}
    >
      <span className="mt-0.5 shrink-0">
        {ICONS[notification.type] ?? ICONS.EXPIRING_SOON}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">
            {notification.title}
          </span>
          {!notification.read && (
            <span className="size-2 shrink-0 rounded-full bg-primary" />
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {notification.body}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {formatDate(notification.createdAt)}
        </span>
      </span>
    </button>
  );
}
