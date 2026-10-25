import Link from "next/link";
import { getMerchant } from "@/lib/gateway";

export const revalidate = 0;

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "▦" },
  { href: "/dashboard/payments", label: "Payments", icon: "💳" },
  { href: "/dashboard/orders", label: "Orders", icon: "📦" },
  { href: "/dashboard/refunds", label: "Refunds", icon: "↩" },
  { href: "/dashboard/customers", label: "Customers", icon: "👥" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: "⚡" },
  { href: "/dashboard/api-keys", label: "API Keys", icon: "🔑" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const merchant = await getMerchant();

  return (
    <div className="flex min-h-screen">
      {/* sidebar */}
      <aside className="w-60 shrink-0 flex flex-col sticky top-0 h-screen" style={{ background: "var(--rzp-navy-deep)" }}>
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white" style={{ background: "var(--rzp-blue)" }}>
            R
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">RazorClone</div>
            <div className="text-[11px]" style={{ color: "#768ea7" }}>{merchant?.name ?? "Merchant"}</div>
          </div>
        </Link>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-[11px]" style={{ color: "#768ea7" }}>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 text-white/70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> test mode
          </span>
          <div className="mt-2 mono">acct: {merchant?.id.slice(0, 16)}…</div>
        </div>
      </aside>

      {/* content */}
      <main className="flex-1 min-w-0 bg-[#f8fafc]">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} className="sidebar-link">
      <span className="w-5 text-center" style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </Link>
  );
}
