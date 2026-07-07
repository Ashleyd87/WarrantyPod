import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { AssetManager } from "@/components/items/asset-manager";
import { ClaimDialog } from "@/components/items/claim-dialog";
import { ItemActions } from "@/components/items/item-actions";
import { WarrantyBadge } from "@/components/items/warranty-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CATEGORY_LABELS,
  CLAIM_STATUS_LABELS,
  WARRANTY_TYPE_LABELS,
  type Category,
  type ClaimStatus,
  type WarrantyType,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings, requireUser } from "@/lib/session";
import { formatDate, formatMoney } from "@/lib/utils";
import { getWarrantyInfo } from "@/lib/warranty";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const settings = await getOrCreateSettings(user.id);
  const { id } = await params;

  const item = await prisma.productItem.findFirst({
    where: { id, userId: user.id },
    include: {
      assets: { orderBy: { createdAt: "asc" } },
      claims: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!item) notFound();

  const warranty = getWarrantyInfo(item, settings.reminderLeadDays);

  const facts: [string, React.ReactNode][] = [
    ["Category", CATEGORY_LABELS[item.category as Category] ?? item.category],
    [
      "Serial number",
      item.serialNumber ? (
        <span className="font-mono">{item.serialNumber}</span>
      ) : (
        "—"
      ),
    ],
    ["Purchase date", formatDate(item.purchaseDate)],
    [
      "Price",
      formatMoney(item.purchasePrice?.toString() ?? null, item.currency),
    ],
    ["Store", item.storeName ?? "—"],
    [
      "Warranty",
      `${WARRANTY_TYPE_LABELS[item.warrantyType as WarrantyType] ?? item.warrantyType}${
        item.warrantyProvider ? ` · ${item.warrantyProvider}` : ""
      }`,
    ],
    [
      "Duration",
      item.warrantyDurationMonths
        ? `${item.warrantyDurationMonths} months${item.warrantyAssumed ? " (assumed)" : ""}`
        : "—",
    ],
    ["Expires", formatDate(item.warrantyExpirationDate)],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/vault"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Vault
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {item.brand} <span className="font-normal">{item.modelName}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Added {formatDate(item.createdAt)}
              {item.archived && " · Archived"}
            </p>
          </div>
          <WarrantyBadge
            status={warranty.status}
            daysRemaining={warranty.daysRemaining}
          />
        </div>
      </div>

      <ItemActions
        itemId={item.id}
        itemName={`${item.brand} ${item.modelName}`}
        archived={item.archived}
      />

      {warranty.status !== "NO_WARRANTY" && warranty.fractionElapsed !== null && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <ShieldCheck className="size-4 text-primary" /> Warranty countdown
              </span>
              <span className="text-muted-foreground">
                {warranty.status === "EXPIRED"
                  ? `Expired ${formatDate(item.warrantyExpirationDate)}`
                  : `${warranty.daysRemaining} days remaining`}
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={Math.round(warranty.fractionElapsed * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={
                  warranty.status === "EXPIRED"
                    ? "h-full bg-destructive"
                    : warranty.status === "EXPIRING_SOON"
                      ? "h-full bg-warning"
                      : "h-full bg-primary"
                }
                style={{ width: `${Math.max(3, warranty.fractionElapsed * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-0.5 text-sm">{value}</dd>
              </div>
            ))}
          </dl>
          {item.notes && (
            <div className="mt-4 border-t border-border pt-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">{item.notes}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos & documents</CardTitle>
        </CardHeader>
        <CardContent>
          <AssetManager
            itemId={item.id}
            assets={item.assets.map((a) => ({
              id: a.id,
              type: a.type,
              fileName: a.fileName,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Claims</CardTitle>
          <ClaimDialog itemId={item.id} />
        </CardHeader>
        <CardContent className="space-y-3">
          {item.claims.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No claims yet. If this product develops a fault while under
              warranty, start a claim and export the PDF claim package.
            </p>
          )}
          {item.claims.map((claim) => (
            <div
              key={claim.id}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        claim.status === "APPROVED" || claim.status === "RESOLVED"
                          ? "success"
                          : claim.status === "DENIED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {CLAIM_STATUS_LABELS[claim.status as ClaimStatus] ??
                        claim.status}
                    </Badge>
                    {claim.claimNumber && (
                      <span className="text-xs text-muted-foreground">
                        Ref {claim.claimNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{claim.issueDescription}</p>
                  <p className="text-xs text-muted-foreground">
                    Opened {formatDate(claim.createdAt)}
                    {claim.submittedAt && ` · Submitted ${formatDate(claim.submittedAt)}`}
                    {claim.resolvedAt && ` · Closed ${formatDate(claim.resolvedAt)}`}
                  </p>
                  {claim.resolutionNotes && (
                    <p className="text-xs text-muted-foreground">
                      Outcome: {claim.resolutionNotes}
                    </p>
                  )}
                </div>
                <ClaimDialog
                  itemId={item.id}
                  claim={{
                    id: claim.id,
                    status: claim.status,
                    claimNumber: claim.claimNumber,
                    providerContact: claim.providerContact,
                    issueDescription: claim.issueDescription,
                    resolutionNotes: claim.resolutionNotes,
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
