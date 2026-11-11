import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  if (["PUBLISHED", "CONFIRMED", "SUCCESS", "FREE", "VALID", "APPROVED"].includes(normalized)) {
    return <Badge variant="success">{status.replace(/_/g, " ")}</Badge>;
  }
  if (
    ["PENDING", "PENDING_PAYMENT", "CREATED", "PENDING_APPROVAL", "REFUND_PENDING", "USED"].includes(
      normalized,
    )
  ) {
    return <Badge variant="warning">{status.replace(/_/g, " ")}</Badge>;
  }
  if (
    ["CANCELLED", "FAILED", "REJECTED", "SUSPENDED", "REFUNDED", "EXPIRED"].includes(normalized)
  ) {
    return <Badge variant="destructive">{status.replace(/_/g, " ")}</Badge>;
  }
  return <Badge variant="secondary">{status.replace(/_/g, " ")}</Badge>;
}

