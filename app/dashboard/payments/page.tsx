import Link from "next/link";
import { listPayments } from "@/lib/gateway";
import { inr, fmtDate } from "@/lib/format";
import { StatusBadge } from "../../status-badge";

export const revalidate = 0;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const all = await listPayments(200);
  let items = all as any[];

  if (status && status !== "all") items = items.filter((p) => p.status === status);
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter(
      (p) =>
        p.id.toLowerCase().includes(needle) ||
        String(p.order_id ?? "").toLowerCase().includes(needle) ||
        String(p.email ?? "").toLowerCase().includes(needle) ||
        String(p.method ?? "").includes(needle)
    );
  }

  const totals = items
    .filter((p) => p.status === "captured" || p.status === "refunded")
    .reduce((s, p) => s + Number(p.amount), 0);

  const filters = [
    ["all", "All"],
    ["captured", "Captured"],
    ["authorized", "Authorized"],
    ["failed", "Failed"],
    ["refunded", "Refunded"],
  ];

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold" style={{ color: "var(--rzp-navy)" }}>Payments</h1>
        <div className="text-sm" style={{ color: "var(--rzp-slate)" }}>
          Captured volume: <span className="font-bold" style={{ color: "var(--rzp-navy)" }}>{inr(totals)}</span>
        </div>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--rzp-slate)" }}>{items.length} payments</p>

      <form method="get" className="flex gap-2 mb-4">
        <input name="q" defaultValue={q ?? ""} placeholder="Search by payment ID, order ID, email…" className="rzp-input max-w-sm" />
        <button type="submit" className="rzp-btn-primary px-4 text-sm">Search</button>
        {q && (
          <Link href="/dashboard/payments" className="px-3 py-2 text-sm rounded-lg border flex items-center" style={{ borderColor: "var(--rzp-border)", color: "var(--rzp-slate)" }}>
            Clear
          </Link>
        )}
      </form>

      <div className="flex gap-2 mb-5 flex-wrap">
        {filters.map(([v, label]) => (
          <Link
            key={v}
            href={`/dashboard/payments?${new URLSearchParams({ status: v, ...(q ? { q } : {}) })}`}
            className="px-3.5 py-1.5 text-sm font-semibold rounded-full border transition-colors"
            style={{
              borderColor: (status ?? "all") === v ? "var(--rzp-blue)" : "var(--rzp-border)",
              background: (status ?? "all") === v ? "#f0f4ff" : "#fff",
              color: (status ?? "all") === v ? "var(--rzp-blue)" : "var(--rzp-slate)",
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="rzp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="rzp-table w-full">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Order</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-[#fafbfd]">
                  <td className="mono text-xs">{p.id}</td>
                  <td className="mono text-xs" style={{ color: "var(--rzp-slate)" }}>{p.order_id}</td>
                  <td className="capitalize text-sm">
                    {p.method}
                    {p.card_network ? <span className="block text-[11px] text-slate-400">{p.card_network}{p.card_last4 ? ` •••• ${p.card_last4}` : ""}</span> : null}
                    {p.upi_id ? <span className="block text-[11px] text-slate-400">{p.upi_id}</span> : null}
                    {p.wallet ? <span className="block text-[11px] text-slate-400">{p.wallet}</span> : null}
                  </td>
                  <td className="font-semibold">{inr(Number(p.amount))}</td>
                  <td className="text-xs" style={{ color: "var(--rzp-slate)" }}>{p.captured ? inr(Number(p.fee)) : "—"}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="text-xs whitespace-nowrap" style={{ color: "var(--rzp-slate)" }}>{fmtDate(Number(p.created_at))}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-sm" style={{ color: "var(--rzp-slate)" }}>
                    No payments match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
