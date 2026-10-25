"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The landing "try a payment" button. Creates the demo order server-side
// (no API keys needed on the public marketing page) and opens the hosted checkout.
export function TryPayment() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function start() {
    setLoading(true);
    try {
      const res = await fetch("/api/demo-order", { method: "POST" });
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
