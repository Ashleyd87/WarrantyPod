import Link from "next/link";
import { Archive, FileWarning, ScanBarcode } from "lucide-react";
import { WarrantyBadge } from "@/components/items/warranty-badge";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, type Category } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/utils";
import type { WarrantyInfo } from "@/lib/warranty";

export interface ItemCardData {
  id: string;
  brand: string;
  modelName: string;
  category: string;
  serialNumber: string | null;
  purchaseDate: Date | null;
  purchasePrice: string | null;
  currency: string;
  archived: boolean;
  hasReceipt: boolean;
  hasOpenClaim: boolean;
  warranty: WarrantyInfo;
}

export function ItemCard({ item }: { item: ItemCardData }) {
  return (
    <Link
      href={`/vault/${item.id}`}
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-ring/40 hover:bg-accent/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {item.brand} <span className="font-normal">{item.modelName}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {CATEGORY_LABELS[item.category as Category] ?? item.category}
            {item.purchaseDate ? ` · Bought ${formatDate(item.purchaseDate)}` : ""}
            {item.purchasePrice
              ? ` · ${formatMoney(item.purchasePrice, item.currency)}`
              : ""}
          </p>
        </div>
        <WarrantyBadge
          status={item.warranty.status}
          daysRemaining={item.warranty.daysRemaining}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {item.serialNumber ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 font-mono">
            <ScanBarcode className="size-3.5" />
            {item.serialNumber}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-warning">
            <FileWarning className="size-3.5" /> Missing serial
          </span>
        )}
        {!item.hasReceipt && (
          <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-warning">
            <FileWarning className="size-3.5" /> Missing receipt
          </span>
        )}
        {item.hasOpenClaim && <Badge variant="default">Claim in progress</Badge>}
        {item.archived && (
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1">
            <Archive className="size-3.5" /> Archived
          </span>
        )}
      </div>
    </Link>
  );
}
