import { Badge } from "@/components/ui/badge";
import type { WarrantyStatus } from "@/lib/warranty";

export function WarrantyBadge({
  status,
  daysRemaining,
}: {
  status: WarrantyStatus;
  daysRemaining: number | null;
}) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="success">
          {daysRemaining !== null ? `${daysRemaining}d left` : "Active"}
        </Badge>
      );
    case "EXPIRING_SOON":
      return (
        <Badge variant="warning">
          {daysRemaining === 0
            ? "Expires today"
            : `${daysRemaining}d left`}
        </Badge>
      );
    case "EXPIRED":
      return <Badge variant="destructive">Expired</Badge>;
    default:
      return <Badge variant="secondary">No warranty</Badge>;
  }
}
