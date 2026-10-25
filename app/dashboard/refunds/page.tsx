import { listRefunds, listPayments } from "@/lib/gateway";
import { inr, fmtDate } from "@/lib/format";
import { StatusBadge } from "../../status-badge";

export const revalidate = 0;

export default async function RefundsPage() {
  const refunds = listRefunds(200) as any[];
  const payments = listPayments(200) as any[];
  const byId = new Map(payments.map((p) => [p.id, p]));
  const total = refunds.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold" style={{ color: "var(--rzp-navy)" }}>Refunds</h1>
        <div className="text-sm" style={{ color: "var(--rzp-slate)" }}>
          Total refunded: <span className="font-bold" style={{ color: "var(--rzp-amber)" }}>{inr(total)}</span>
        </div>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--rzp-slate)" }}>
        Refunds move a captured payment back to the customer. Create one via the API:
        <span className="mono ml-1">POST /api/v1/refunds</span>
      </p>

      <div className="rzp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="rzp-table w-full">
            <thead>
              <tr>
                <th>Refund ID</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Speed</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => {
                const p = byId.get(r.payment_id);
                return (
                  <tr key={r.id} className="hover:bg-[#fafbfd]">
                    <td className="mono text-xs">{r.id}</td>
                    <td>
                      <span className="mono text-xs">{r.payment_id}</span>
                      <span className="block text-[11px] text-slate-400">
                        {p ? `${p.method} · ${inr(Number(p.amount))}` : ""}
                      </span>
                    </td>
                    <td className="font-semibold">{inr(Number(r.amount))}</td>
                    <td className="text-sm">{r.speed}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="text-xs whitespace-nowrap" style={{ color: "var(--rzp-slate)" }}>{fmtDate(Number(r.created_at))}</td>
                  </tr>
                );
              })}
              {refunds.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm" style={{ color: "var(--rzp-slate)" }}>
                    No refunds yet. Refund a captured payment through the API to see it here.
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
