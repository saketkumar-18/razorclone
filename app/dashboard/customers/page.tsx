import { listCustomers, listPayments } from "@/lib/gateway";
import { fmtDate } from "@/lib/format";

export const revalidate = 0;

export default async function CustomersPage() {
  const customers = listCustomers(200) as any[];
  const payments = listPayments(2000) as any[];
  const byEmail = new Map<string, any[]>();
  for (const p of payments) {
    if (!p.email) continue;
    const arr = byEmail.get(String(p.email)) ?? [];
    arr.push(p);
    byEmail.set(String(p.email), arr);
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold" style={{ color: "var(--rzp-navy)" }}>Customers</h1>
      <p className="text-sm mt-1 mb-6" style={{ color: "var(--rzp-slate)" }}>
        Customers are created automatically when a checkout completes with an email. {customers.length} customers.
      </p>

      <div className="rzp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="rzp-table w-full">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Payments</th>
                <th>Total spent</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const cps = byEmail.get(String(c.email)) ?? [];
                const spent = cps.filter((p) => p.status === "captured" || p.status === "refunded").reduce((s, p) => s + Number(p.amount), 0);
                return (
                  <tr key={c.id} className="hover:bg-[#fafbfd]">
                    <td className="mono text-xs">{c.id}</td>
                    <td className="font-medium">{c.name ?? "—"}</td>
                    <td className="text-sm">{c.email}</td>
                    <td className="text-sm" style={{ color: "var(--rzp-slate)" }}>{c.contact ?? "—"}</td>
                    <td>{cps.length}</td>
                    <td className="font-semibold">{"₹" + (spent / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="text-xs" style={{ color: "var(--rzp-slate)" }}>{fmtDate(Number(c.created_at))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
