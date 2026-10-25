"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TryPayment() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function start() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 49900,
          currency: "INR",
          receipt: "rcpt_" + Date.now(),
          notes: { source: "landing-demo" },
        }),
      });
      const order = await res.json();
      if (order.id) {
        router.push(`/checkout/${order.id}`);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={start}
      disabled={loading}
      className="text-sm font-semibold px-6 py-3 rounded-lg rzp-btn-primary"
    >
      {loading ? "Creating order…" : "Try a test payment ₹499"}
    </button>
  );
}
