import Link from "next/link";
import { listPayments, listOrders, listCustomers, listRefunds, getMerchant } from "@/lib/gateway";
import { inr, fmtDateShort } from "@/lib/format";
import { StatusBadge } from "../status-badge";

export const revalidate = 0;

export default async function OverviewPage() {
  const [merchant, payments, orders, customers, refunds] = await Promise.all([
    getMerchant(),
    listPayments(100),
    listOrders(100),
    listCustomers(100),
    listRefunds(1000),
  ]);

  const captured = payments.filter((p) => p.status === "captured" || p.status === "refunded");
  const totalVolume = captured.reduce((s, p) => s + Number(p.amount), 0);
  const fees = captured.reduce((s, p) => s + Number(p.fee), 0);
  const totalRefunds = refunds.reduce((s, r) => s + Number(r.amount), 0);
  const successRate = payments.length ? Math.round((captured.length / payments.length) * 100) : 0;

  // last 7 days volume
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const start = d.getTime();
    const end = start + 86400000;
    const vol = captured.filter((p) => Number(p.created_at) >= start && Number(p.created_at) < end).reduce((s, p) => s + Number(p.amount), 0);
    return { label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), vol };
  });
  const maxVol = Math.max(...days.map((d) => d.vol), 1);

  // methods split
  const byMethod = new Map<string, number>();
  for (const p of captured) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + Number(p.amount));
  const methodsTotal = [...byMethod.entries()].sort((a, b) => b[1] - a[1]);

  const recent = payments.slice(0, 8);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--rzp-navy)" }}>Good day, {merchant?.name?.split(" ")[0] ?? "Merchant"} 👋</h1>
          <p className="text-sm mt-1" style={{ color: "var(--rzp-slate)" }}>Here's what's happening with your payments today.</p>
        </div>
        <Link href="/checkout/demo" className="rzp-btn-primary px-4 py-2 text-sm">
          + Create test order
        </Link>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Payments volume", inr(totalVolume - totalRefunds), "net of refunds", "var(--rzp-navy)"],
          ["Transactions", String(captured.length), `${successRate}% success rate`, "var(--rzp-blue)"],
          ["Fees collected", inr(fees), "2% + 18% GST on captured", "var(--rzp-amber)"],
          ["Customers", String(customers.length), "unique customers", "var(--rzp-green)"],
        ].map(([label, val, sub, color]) => (
          <div key={label as string} className="rzp-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--rzp-slate)" }}>{label}</div>
            <div className="text-2xl font-bold mt-2" style={{ color: color as string }}>{val}</div>
            <div className="text-xs mt-1" style={{ color: "var(--rzp-slate)" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* volume chart + methods */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <div className="rzp-card p-5 lg:col-span-2">
          <div className="text-sm font-semibold mb-4">Volume — last 7 days</div>
          <div className="flex items-end gap-3 h-40">
            {days.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="text-[10px] mono" style={{ color: "var(--rzp-slate)" }}>{d.vol > 0 ? "₹" + (d.vol / 1000).toFixed(0) + "k" : ""}</div>
                <div className="w-full rounded-t-md transition-all" style={{ height: `${Math.max((d.vol / maxVol) * 100, 4)}%`, background: "linear-gradient(180deg, var(--rzp-blue), var(--rzp-blue-light))" }} />
                <div className="text-[11px] font-medium" style={{ color: "var(--rzp-slate)" }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rzp-card p-5">
          <div className="text-sm font-semibold mb-4">Payment methods</div>
          <div className="space-y-3">
            {methodsTotal.map(([m, v]) => {
              const pct = totalVolume ? Math.round((v / totalVolume) * 100) : 0;
              return (
                <div key={m}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium capitalize">{m}</span>
                    <span className="mono" style={{ color: "var(--rzp-slate)" }}>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: "#eef1f5" }}>
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: "var(--rzp-blue)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* recent payments */}
      <div className="rzp-card mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--rzp-border)" }}>
          <div className="text-sm font-semibold">Recent payments</div>
          <Link href="/dashboard/payments" className="text-sm font-semibold" style={{ color: "var(--rzp-blue)" }}>View all →</Link>
        </div>
        <table className="rzp-table w-full">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((p) => (
              <tr key={p.id}>
                <td className="mono text-xs">{p.id}</td>
                <td className="capitalize">{p.method}</td>
                <td className="font-semibold">{inr(Number(p.amount))}</td>
                <td><StatusBadge status={p.status} /></td>
                <td className="text-xs" style={{ color: "var(--rzp-slate)" }}>{fmtDateShort(Number(p.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
