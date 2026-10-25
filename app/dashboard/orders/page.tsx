import { listOrders } from "@/lib/gateway";
import { inr, fmtDate } from "@/lib/format";
import { StatusBadge } from "../../status-badge";

export const revalidate = 0;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  let items = listOrders(200) as any[];
  if (status && status !== "all") items = items.filter((o) => o.status === status);

  const filters = [
    ["all", "All"],
    ["created", "Created"],
    ["attempted", "Attempted"],
    ["paid", "Paid"],
  ];

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold" style={{ color: "var(--rzp-navy)" }}>Orders</h1>
      <p className="text-sm mt-1 mb-6" style={{ color: "var(--rzp-slate)" }}>
        Orders are created server-side before a checkout. {items.length} orders total.
      </p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {filters.map(([v, label]) => (
          <a
            key={v}
            href={`/dashboard/orders?status=${v}`}
            className="px-3.5 py-1.5 text-sm font-semibold rounded-full border transition-colors"
            style={{
              borderColor: (status ?? "all") === v ? "var(--rzp-blue)" : "var(--rzp-border)",
              background: (status ?? "all") === v ? "#f0f4ff" : "#fff",
              color: (status ?? "all") === v ? "var(--rzp-blue)" : "var(--rzp-slate)",
            }}
          >
            {label}
          </a>
        ))}
      </div>

      <div className="rzp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="rzp-table w-full">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Receipt</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="hover:bg-[#fafbfd]">
                  <td className="mono text-xs">{o.id}</td>
                  <td className="mono text-xs" style={{ color: "var(--rzp-slate)" }}>{o.receipt ?? "—"}</td>
                  <td className="font-semibold">{inr(Number(o.amount))}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-xs" style={{ color: "var(--rzp-slate)" }}>
                    {typeof o.notes === "object" && o.notes ? Object.entries(o.notes).map(([k, v]) => `${k}: ${v}`).join(", ") : "—"}
                  </td>
                  <td className="text-xs whitespace-nowrap" style={{ color: "var(--rzp-slate)" }}>{fmtDate(Number(o.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
