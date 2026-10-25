export function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    captured: "badge-captured",
    paid: "badge-captured",
    processed: "badge-captured",
    authorized: "badge-authorized",
    created: "badge-authorized",
    attempted: "badge-authorized",
    pending: "badge-authorized",
    failed: "badge-failed",
    refunded: "badge-refunded",
  };
  return <span className={`badge ${cls[status] ?? "badge-authorized"}`}>{status}</span>;
}
