import Link from "next/link";
import { getMerchant, getApiKey } from "@/lib/gateway";
import { TryPayment } from "./try-payment";

export const revalidate = 0;

export default function Home() {
  const merchant = getMerchant();
  const key = getApiKey();

  return (
    <div className="min-h-screen" style={{ background: "var(--rzp-navy-deep)", color: "#fff" }}>
      {/* nav */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white" style={{ background: "var(--rzp-blue)" }}>
            R
          </div>
          <span className="text-lg font-semibold tracking-tight">RazorClone</span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)", color: "#9fb3c8" }}>
            simulator
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-7 text-sm" style={{ color: "#9fb3c8" }}>
          <a href="#products" className="hover:text-white">Products</a>
          <a href="#api" className="hover:text-white">API</a>
          <a href="#how" className="hover:text-white">How it works</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm font-medium hover:text-white" style={{ color: "#9fb3c8" }}>
            Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-semibold px-4 py-2 rounded-lg"
            style={{ background: "var(--rzp-blue)" }}
          >
            Login →
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
        <p className="text-sm font-semibold mb-5" style={{ color: "var(--rzp-blue-light)" }}>
          The all-in-one payments platform — recreated
        </p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight max-w-3xl mx-auto">
          Accept payments.
          <br />
          <span style={{ color: "var(--rzp-blue-light)" }}>Built for developers.</span>
        </h1>
        <p className="mt-6 text-lg max-w-xl mx-auto" style={{ color: "#9fb3c8" }}>
          A working Razorpay-style payment gateway: hosted checkout, merchant dashboard,
          REST API and webhooks. Every flow is simulated — no real money moves.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <TryPayment />
          <a
            href="#how"
            className="text-sm font-semibold px-6 py-3 rounded-lg border"
            style={{ borderColor: "rgba(255,255,255,0.15)", color: "#cbd8e6" }}
          >
            Explore the flow ↓
          </a>
        </div>

        {/* stat chips */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
          {[
            ["10+", "payment methods"],
            ["HMAC", "signed webhooks"],
            ["INR", "subunit amounts"],
            ["100%", "simulated"],
          ].map(([a, b]) => (
            <div key={b} className="p-4 rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
              <div className="text-xl font-bold">{a}</div>
              <div className="text-xs mt-1" style={{ color: "#9fb3c8" }}>{b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* products */}
      <section id="products" className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Everything a payment platform has</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              t: "Hosted Checkout",
              d: "A full checkout page — cards, UPI, netbanking, wallets, EMI, QR — with Razorpay's documented payment lifecycle.",
              href: "/dashboard",
            },
            {
              t: "Merchant Dashboard",
              d: "Overview, payments, orders, refunds, customers, API keys, webhooks and settings, in the real dark-sidebar layout.",
              href: "/dashboard",
            },
            {
              t: "REST API + Webhooks",
              d: "Create orders, capture payments, verify HMAC signatures, and watch payment.captured events roll in.",
              href: "/dashboard/webhooks",
            },
          ].map((c) => (
            <Link key={c.t} href={c.href} className="p-6 rounded-2xl border transition-transform hover:-translate-y-0.5" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
              <div className="font-semibold text-lg">{c.t}</div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#9fb3c8" }}>{c.d}</p>
              <span className="inline-block mt-4 text-sm font-semibold" style={{ color: "var(--rzp-blue-light)" }}>Open →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* API */}
      <section id="api" className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">The API, in your terminal</h2>
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.12)", background: "#0b1520" }}>
          <div className="flex items-center gap-1.5 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <span className="w-3 h-3 rounded-full bg-[#f0263c]/70" />
            <span className="w-3 h-3 rounded-full bg-[#f59e0b]/70" />
            <span className="w-3 h-3 rounded-full bg-[#16a34a]/70" />
            <span className="ml-3 text-xs mono" style={{ color: "#9fb3c8" }}>curl</span>
          </div>
          <pre className="p-5 text-sm leading-relaxed overflow-x-auto mono" style={{ color: "#c9d8e8" }}>
{`# 1. Create an order (server-side)
curl -X POST http://localhost:3000/api/v1/orders \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 49900, "currency": "INR", "receipt": "rcpt_001"}'

# 2. Open the hosted checkout
#    → http://localhost:3000/checkout/{order_id}

# 3. After payment, verify the signature server-side
curl -X POST http://localhost:3000/api/v1/utils/verify-signature \\
  -H "Content-Type: application/json" \\
  -d '{"payload": "{order_id}|{payment_id}", "signature": "{razorpay_signature}"}'`}
          </pre>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">How the payment lifecycle works</h2>
        <div className="grid md:grid-cols-3 gap-5 text-center">
          {[
            ["1", "Order created", "The merchant creates an order server-side. The order moves from created to attempted the moment a payment is tried."],
            ["2", "Payment authorized", "The checkout processes the payment. Card, UPI, netbanking, wallet or EMI — the payment is authorized against the order."],
            ["3", "Payment captured", "Capture moves the payment to captured and the order to paid. Webhooks fire at every stage, each signed with HMAC-SHA256."],
          ].map(([n, t, d]) => (
            <div key={n} className="p-6 rounded-2xl border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold" style={{ background: "var(--rzp-blue)", color: "#fff" }}>{n}</div>
              <div className="mt-4 font-semibold">{t}</div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#9fb3c8" }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 mt-10">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm" style={{ color: "#768ea7" }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--rzp-blue)" }}>R</div>
            RazorClone — a payment gateway simulator
          </div>
          <div>
            {merchant?.name ?? "Demo merchant"} · {key ? key.key_id.slice(0, 16) + "…" : ""} · test mode
          </div>
        </div>
      </footer>
    </div>
  );
}
