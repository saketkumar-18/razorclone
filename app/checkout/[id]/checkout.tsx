"use client";

import { useEffect, useMemo, useState } from "react";
import { inr } from "@/lib/format";
import {
  TEST_CARDS,
  PAYMENT_METHODS,
  NETBANKING_BANKS,
  WALLETS,
  EMI_BANKS,
} from "@/lib/payment-methods";

type Order = {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
  status: string;
  notes: Record<string, unknown>;
};

type PaymentResult = {
  id: string;
  status: string;
  method: string;
  order_id: string;
  razorpay_signature: string | null;
  card_last4: string | null;
  card_network: string | null;
  upi_id: string | null;
  bank: string | null;
  wallet: string | null;
};

const METHODS = ["card", "upi", "netbanking", "wallet", "emi", "qr"] as const;

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function Checkout({ order }: { order: Order }) {
  const [live, setLive] = useState<{ mode: "live"; key_id: string } | null>(null);
  const [liveReady, setLiveReady] = useState(false);
  const [method, setMethod] = useState<(typeof METHODS)[number]>("card");
  const [phase, setPhase] = useState<"form" | "processing" | "success" | "failed">("form");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState("");

  // card form
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  // upi
  const [upiId, setUpiId] = useState("");
  // method-specific selection
  const [bank, setBank] = useState(NETBANKING_BANKS[0]);
  const [wallet, setWallet] = useState(WALLETS[0]);
  const [emiBank, setEmiBank] = useState(EMI_BANKS[0]);
  const [emiTenure, setEmiTenure] = useState(3);
  // contact
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");

  // Determine PSP mode (live vs simulator) from the server
  useEffect(() => {
    fetch(`/api/checkout/config?order_id=${encodeURIComponent(order.id)}`)
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.mode === "live" && cfg.key_id) {
          setLive({ mode: "live", key_id: cfg.key_id });
          // lazily load Razorpay checkout.js for the live path
          if (!window.Razorpay) {
            const s = document.createElement("script");
            s.src = "https://checkout.razorpay.com/v1/checkout.js";
            s.async = true;
            s.onload = () => setLiveReady(true);
            document.head.appendChild(s);
          } else {
            setLiveReady(true);
          }
        }
      })
      .catch(() => {});
  }, [order.id]);

  const payLabel = useMemo(() => {
    if (method === "emi") {
      const monthly = Math.round(order.amount / emiTenure / 100) * 100;
      return `Pay ${inr(monthly * 100)}/mo for ${emiTenure} months`;
    }
    return `Pay ${inr(order.amount)}`;
  }, [method, emiTenure, order.amount]);

  function validate(): string | null {
    if (method === "card") {
      const digits = cardNumber.replace(/\s+/g, "");
      if (digits.length < 12) return "Enter a valid card number";
      if (!cardName.trim()) return "Enter the name on the card";
      if (!/^\d{2}\s?\/\s?\d{2}$/.test(cardExpiry)) return "Enter expiry as MM/YY";
      if (!/^\d{3,4}$/.test(cardCvv)) return "Enter a valid CVV";
    }
    if (method === "upi") {
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) return "Enter a valid UPI ID (e.g. name@okhdfcbank)";
    }
    if (!email.includes("@")) return "Enter a valid email for the receipt";
    return null;
  }

  // ---- Live mode: open Razorpay's hosted checkout (checkout.js) ----
  async function payLive() {
    if (!live || !window.Razorpay) {
      setError("Checkout is still loading — please retry.");
      return;
    }
    setError("");
    setPhase("processing");
    const rzp = new window.Razorpay({
      key: live.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "RazorClone",
      description: order.receipt ?? "Order payment",
      order_id: order.id,
      prefill: { email, contact },
      handler: async (response: Record<string, string>) => {
        try {
          const res = await fetch("/api/checkout/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id,
              signature: response.razorpay_signature,
            }),
          });
          const data = await res.json();
          if (data.id && (data.status === "captured" || data.status === "authorized")) {
            setResult({ ...data, razorpay_signature: data.razorpay_signature ?? response.razorpay_signature });
            setPhase("success");
          } else if (data.error === "signature_mismatch") {
            setError("Signature verification failed — contact the merchant.");
            setPhase("failed");
            setResult({ id: response.razorpay_payment_id, status: "failed", method: "razorpay", order_id: order.id, razorpay_signature: null, card_last4: null, card_network: null, upi_id: null, bank: null, wallet: null });
          } else {
            setPhase("failed");
            setResult({ id: response.razorpay_payment_id, status: "failed", method: "razorpay", order_id: order.id, razorpay_signature: null, card_last4: null, card_network: null, upi_id: null, bank: null, wallet: null });
          }
        } catch {
          setPhase("failed");
          setResult({ id: response.razorpay_payment_id, status: "failed", method: "razorpay", order_id: order.id, razorpay_signature: null, card_last4: null, card_network: null, upi_id: null, bank: null, wallet: null });
        }
      },
    });
    rzp.open();
  }

  async function paySim() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError("");
    setPhase("processing");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          method,
          email,
          contact,
          description: order.receipt ?? "Order payment",
          card: { number: cardNumber, name: cardName, expiry: cardExpiry, cvv: cardCvv },
          upi_id: upiId,
          bank: method === "netbanking" ? bank : method === "emi" ? emiBank : undefined,
          wallet: method === "wallet" ? wallet : undefined,
          emi_tenure: method === "emi" ? emiTenure : undefined,
        }),
      });
      const data = await res.json();
      if (data.id && data.status === "authorized") {
        setResult(data);
        setPhase("success");
      } else {
        setResult(data);
        setPhase("failed");
      }
    } catch {
      setPhase("failed");
      setResult({ id: "", status: "failed", method, order_id: order.id, razorpay_signature: null, card_last4: null, card_network: null, upi_id: null, bank: null, wallet: null });
    }
  }

  function reset() {
    setPhase("form");
    setResult(null);
    setError("");
  }

  const amount = inr(order.amount);

  return (
    <div className="rzp-card overflow-hidden shadow-sm">
      {phase === "form" && (
        <>
          {/* order summary */}
          <div className="px-6 py-5 border-b" style={{ borderColor: "var(--rzp-border)", background: "#fff" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--rzp-slate)" }}>
                  {order.receipt ? `Receipt ${order.receipt}` : "Order payment"}
                </div>
                <div className="text-3xl font-bold mt-1" style={{ color: "var(--rzp-navy)" }}>{amount}</div>
              </div>
              <div className="text-right">
                <div className="text-xs mono" style={{ color: "var(--rzp-slate)" }}>{order.id}</div>
                <div className="text-xs mt-1" style={{ color: "var(--rzp-slate)" }}>
                  {order.currency} · {live ? "live payments" : "test mode"}
                </div>
              </div>
            </div>
          </div>

          {live ? (
            /* ---- LIVE MODE: Razorpay hosted checkout ---- */
            <div className="p-8 text-center">
              <div className="text-sm font-semibold mb-2" style={{ color: "var(--rzp-navy)" }}>
                Payment is processed securely by Razorpay
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--rzp-slate)" }}>
                Cards, UPI, netbanking, wallets and EMI are supported. Your card details never
                touch this server.
              </p>
              <div className="max-w-xs mx-auto space-y-3 text-left">
                <input className="rzp-input" placeholder="Email for receipt" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="rzp-input" placeholder="Phone (optional)" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              {error && (
                <div className="mt-4 text-sm font-medium rounded-lg px-4 py-3" style={{ background: "#fef3f2", color: "#b42318" }}>
                  {error}
                </div>
              )}
              <button onClick={payLive} disabled={!liveReady} className="rzp-btn-primary w-full mt-5 py-3.5 text-base">
                {liveReady ? `Pay ${amount} with Razorpay` : "Loading secure checkout…"}
              </button>
            </div>
          ) : (
            /* ---- SIMULATOR MODE: mock payment form ---- */
            <>
              {/* method tabs */}
              <div className="flex border-b overflow-x-auto" style={{ borderColor: "var(--rzp-border)", background: "#fafbfd" }}>
                {METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className="px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors"
                    style={{
                      color: method === m ? "var(--rzp-blue)" : "var(--rzp-slate)",
                      borderBottom: method === m ? "2px solid var(--rzp-blue)" : "2px solid transparent",
                    }}
                  >
                    {PAYMENT_METHODS[m].label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* CARD */}
                {method === "card" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>Card Number</label>
                      <input
                        className="rzp-input mono"
                        placeholder="4100 2800 0000 1007"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>Name on Card</label>
                      <input className="rzp-input" placeholder="RAHUL SHARMA" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>Expiry (MM/YY)</label>
                        <input className="rzp-input mono" placeholder="12/28" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>CVV</label>
                        <input className="rzp-input mono" placeholder="123" type="password" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} />
                      </div>
                    </div>
                    <details className="text-xs rounded-lg p-3 border" style={{ borderColor: "var(--rzp-border)", background: "#fafbfd" }}>
                      <summary className="font-semibold cursor-pointer" style={{ color: "var(--rzp-slate)" }}>Test cards (documented in Razorpay docs)</summary>
                      <ul className="mt-2 space-y-1 mono" style={{ color: "var(--rzp-navy)" }}>
                        {TEST_CARDS.map((c) => (
                          <li key={c.number}>
                            <button type="button" onClick={() => setCardNumber(c.number)} className="hover:underline" style={{ color: "var(--rzp-blue)" }}>
                              {c.number}
                            </button>{" "}
                            — {c.network} {c.type}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}

                {/* UPI */}
                {method === "upi" && (
                  <div className="space-y-3">
                    <input className="rzp-input mono" placeholder="yourname@okhdfcbank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                    <p className="text-xs" style={{ color: "var(--rzp-slate)" }}>
                      Enter a UPI ID to simulate an UPI payment. Prefix with <span className="mono">fail@</span> to simulate a failure.
                    </p>
                  </div>
                )}

                {/* NETBANKING */}
                {method === "netbanking" && (
                  <div className="space-y-2">
                    {NETBANKING_BANKS.map((b) => (
                      <label key={b} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors" style={{ borderColor: bank === b ? "var(--rzp-blue)" : "var(--rzp-border)", background: bank === b ? "#f0f4ff" : "#fff" }}>
                        <input type="radio" name="bank" checked={bank === b} onChange={() => setBank(b)} className="accent-[#305eff]" />
                        <span className="text-sm font-medium">{b}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* WALLET */}
                {method === "wallet" && (
                  <div className="grid grid-cols-2 gap-3">
                    {WALLETS.map((w) => (
                      <button key={w} onClick={() => setWallet(w)} className="p-4 rounded-lg border text-sm font-semibold transition-colors" style={{ borderColor: wallet === w ? "var(--rzp-blue)" : "var(--rzp-border)", background: wallet === w ? "#f0f4ff" : "#fff", color: wallet === w ? "var(--rzp-blue)" : "var(--rzp-navy)" }}>
                        {w}
                      </button>
                    ))}
                  </div>
                )}

                {/* EMI */}
                {method === "emi" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>Bank</label>
                      <select className="rzp-input" value={emiBank} onChange={(e) => setEmiBank(e.target.value)}>
                        {EMI_BANKS.map((b) => (
                          <option key={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>Tenure</label>
                      <div className="flex gap-2">
                        {[3, 6, 9, 12].map((t) => (
                          <button key={t} onClick={() => setEmiTenure(t)} className="px-4 py-2 rounded-lg border text-sm font-semibold" style={{ borderColor: emiTenure === t ? "var(--rzp-blue)" : "var(--rzp-border)", background: emiTenure === t ? "#f0f4ff" : "#fff", color: emiTenure === t ? "var(--rzp-blue)" : "var(--rzp-navy)" }}>
                            {t} mo
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* QR */}
                {method === "qr" && (
                  <div className="text-center py-6">
                    <div className="inline-block p-4 rounded-xl border" style={{ borderColor: "var(--rzp-border)", background: "#fff" }}>
                      <svg width="160" height="160" viewBox="0 0 16 16" shapeRendering="crispEdges">
                        {Array.from({ length: 16 * 16 }).map((_, i) => {
                          const x = i % 16, y = Math.floor(i / 16);
                          const on = (order.id.charCodeAt((x * 3 + y * 5) % order.id.length) + x * y) % 3 === 0;
                          return <rect key={i} x={x} y={y} width="1" height="1" fill={on ? "var(--rzp-navy)" : "#fff"} />;
                        })}
                      </svg>
                    </div>
                    <p className="text-sm mt-4 font-medium" style={{ color: "var(--rzp-navy)" }}>Scan & pay with any UPI app</p>
                    <p className="text-xs mt-1" style={{ color: "var(--rzp-slate)" }}>Simulated QR — completing will succeed</p>
                  </div>
                )}

                {/* contact */}
                <div className="grid grid-cols-2 gap-4 mt-5">
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>Email</label>
                    <input className="rzp-input" placeholder="customer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>Phone</label>
                    <input className="rzp-input" placeholder="+91 98765 43210" value={contact} onChange={(e) => setContact(e.target.value)} />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 text-sm font-medium rounded-lg px-4 py-3" style={{ background: "#fef3f2", color: "#b42318" }}>
                    {error}
                  </div>
                )}

                <button onClick={paySim} className="rzp-btn-primary w-full mt-5 py-3.5 text-base">
                  {payLabel}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {phase === "processing" && (
        <div className="p-16 text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "var(--rzp-blue)" }} />
          <div className="mt-5 text-lg font-semibold" style={{ color: "var(--rzp-navy)" }}>Processing payment…</div>
          <div className="mt-1 text-sm" style={{ color: "var(--rzp-slate)" }}>Contacting your bank — please don't close this window</div>
        </div>
      )}

      {phase === "success" && result && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl" style={{ background: "#ecfdf3", color: "#067647" }}>✓</div>
          <div className="mt-5 text-2xl font-bold" style={{ color: "var(--rzp-navy)" }}>Payment successful</div>
          <div className="mt-2 text-sm" style={{ color: "var(--rzp-slate)" }}>
            {inr(order.amount)} paid via {PAYMENT_METHODS[result.method as keyof typeof PAYMENT_METHODS]?.label ?? result.method}
            {result.card_last4 ? ` •••• ${result.card_last4}` : ""}
          </div>
          <div className="mt-6 space-y-2 text-left max-w-sm mx-auto rounded-xl border p-4" style={{ borderColor: "var(--rzp-border)", background: "#fafbfd" }}>
            <div className="flex justify-between text-xs"><span style={{ color: "var(--rzp-slate)" }}>Payment ID</span><span className="mono">{result.id || "—"}</span></div>
            <div className="flex justify-between text-xs"><span style={{ color: "var(--rzp-slate)" }}>Order ID</span><span className="mono">{result.order_id}</span></div>
            <div className="flex justify-between text-xs items-start gap-3"><span style={{ color: "var(--rzp-slate)" }}>Signature</span><span className="mono break-all text-right">{result.razorpay_signature ? result.razorpay_signature.slice(0, 24) + "…" : "—"}</span></div>
          </div>
          <div className="mt-6 flex gap-3 justify-center">
            <a href={`/dashboard/payments?q=${result.id}`} className="rzp-btn-primary px-5 py-2.5 text-sm">View in dashboard</a>
            <button onClick={reset} className="px-5 py-2.5 text-sm font-semibold rounded-lg border" style={{ borderColor: "var(--rzp-border)", color: "var(--rzp-navy)" }}>
              New payment
            </button>
          </div>
        </div>
      )}

      {phase === "failed" && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl" style={{ background: "#fef3f2", color: "#b42318" }}>✕</div>
          <div className="mt-5 text-2xl font-bold" style={{ color: "var(--rzp-navy)" }}>Payment failed</div>
          <div className="mt-2 text-sm" style={{ color: "var(--rzp-slate)" }}>
            {live
              ? "Your payment was not completed. You can retry or contact the merchant."
              : "Your payment could not be processed. The test card was declined — try a documented success card."}
          </div>
          {result?.id && (
            <div className="mt-4 text-xs mono" style={{ color: "var(--rzp-slate)" }}>payment_id: {result.id}</div>
          )}
          <button onClick={reset} className="rzp-btn-primary px-6 py-2.5 text-sm mt-6">Try again</button>
        </div>
      )}
    </div>
  );
}
