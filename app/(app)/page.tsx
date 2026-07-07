import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  PackagePlus,
  PiggyBank,
  ShieldCheck,
  TimerOff,
} from "lucide-react";
import { ItemCard } from "@/components/items/item-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toItemCardData } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings, requireUser } from "@/lib/session";
import { formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const settings = await getOrCreateSettings(user.id);

  const items = await prisma.productItem.findMany({
    where: { userId: user.id, archived: false },
    include: {
      assets: { select: { type: true } },
      claims: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const cards = items.map((i) => toItemCardData(i, settings.reminderLeadDays));

  const active = cards.filter(
    (c) => c.warranty.status === "ACTIVE" || c.warranty.status === "EXPIRING_SOON"
  );
  const expiringSoon = cards
    .filter((c) => c.warranty.status === "EXPIRING_SOON")
    .sort((a, b) => (a.warranty.daysRemaining ?? 0) - (b.warranty.daysRemaining ?? 0));
  const expired = cards.filter((c) => c.warranty.status === "EXPIRED");
  const protectedValue = active.reduce(
    (sum, c) => sum + (c.purchasePrice ? Number(c.purchasePrice) : 0),
    0
  );
  const needsAttention = cards.filter(
    (c) => !c.hasReceipt || !c.serialNumber
  );

  const stats = [
    {
      label: "Products",
      value: String(cards.length),
      icon: ShieldCheck,
      className: "text-primary",
    },
    {
      label: "Protected value",
      value: formatMoney(protectedValue, settings.currency),
      icon: PiggyBank,
      className: "text-success",
    },
    {
      label: `Expiring ≤ ${settings.reminderLeadDays}d`,
      value: String(expiringSoon.length),
      icon: AlertTriangle,
      className: "text-warning",
    },
    {
      label: "Expired",
      value: String(expired.length),
      icon: TimerOff,
      className: "text-destructive",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Hi {user.name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s how your vault is looking.
          </p>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/vault/new">
            <PackagePlus /> Add product
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <s.icon className={`size-5 ${s.className}`} />
              <p className="mt-2 text-xl font-bold leading-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <PackagePlus className="size-7" />
            </div>
            <p className="font-semibold">Your vault is empty</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Photograph a receipt and a serial sticker — the AI does the data
              entry, and you&apos;ll never lose a warranty again.
            </p>
            <Button asChild className="mt-2">
              <Link href="/vault/new">Add your first product</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {expiringSoon.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Expiring soon</h2>
                <Link
                  href="/vault?filter=expiring"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {expiringSoon.slice(0, 4).map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {needsAttention.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">
                Missing evidence{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  — a claim without receipt or serial usually fails
                </span>
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {needsAttention.slice(0, 4).map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recently added</h2>
              <Link
                href="/vault"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open vault <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {cards.slice(0, 4).map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
