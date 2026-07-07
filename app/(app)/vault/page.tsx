import Link from "next/link";
import { Download, PackagePlus, SearchX } from "lucide-react";
import { ItemCard } from "@/components/items/item-card";
import { VaultFilters } from "@/components/items/vault-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toItemCardData } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings, requireUser } from "@/lib/session";

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; filter?: string }>;
}) {
  const user = await requireUser();
  const settings = await getOrCreateSettings(user.id);
  const { q = "", category = "", filter = "" } = await searchParams;

  const items = await prisma.productItem.findMany({
    where: {
      userId: user.id,
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { brand: { contains: q, mode: "insensitive" as const } },
              { modelName: { contains: q, mode: "insensitive" as const } },
              { serialNumber: { contains: q, mode: "insensitive" as const } },
              { storeName: { contains: q, mode: "insensitive" as const } },
              { notes: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: {
      assets: { select: { type: true } },
      claims: { select: { status: true } },
    },
    orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
  });

  let cards = items.map((i) => toItemCardData(i, settings.reminderLeadDays));

  switch (filter) {
    case "expiring":
      cards = cards
        .filter((c) => c.warranty.status === "EXPIRING_SOON")
        .sort(
          (a, b) => (a.warranty.daysRemaining ?? 0) - (b.warranty.daysRemaining ?? 0)
        );
      break;
    case "active":
      cards = cards.filter(
        (c) =>
          c.warranty.status === "ACTIVE" || c.warranty.status === "EXPIRING_SOON"
      );
      break;
    case "expired":
      cards = cards.filter((c) => c.warranty.status === "EXPIRED");
      break;
    case "claims":
      cards = cards.filter((c) => c.hasOpenClaim);
      break;
    case "archived":
      cards = cards.filter((c) => c.archived);
      break;
    default:
      cards = cards.filter((c) => !c.archived);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vault</h1>
          <p className="text-sm text-muted-foreground">
            {cards.length} product{cards.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="icon" title="Export CSV">
            <a href="/api/export/csv" download>
              <Download />
            </a>
          </Button>
          <Button asChild>
            <Link href="/vault/new">
              <PackagePlus /> Add
            </Link>
          </Button>
        </div>
      </div>

      <VaultFilters q={q} category={category} filter={filter} />

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <SearchX className="size-8 text-muted-foreground" />
            <p className="font-semibold">Nothing here</p>
            <p className="text-sm text-muted-foreground">
              {q || category || filter
                ? "No products match these filters."
                : "Add your first product to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
