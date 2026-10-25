import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/gateway";
import { PSP_MODE } from "@/lib/config";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// POST /api/demo-order — public demo endpoint for the marketing page only.
// Creates a fixed ₹499 order so visitors can try the hosted checkout without
// API credentials. In live mode this creates a real (but unpaid) Razorpay order,
// so we keep it rate-limited by design: only ever a fixed amount.
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", retry_after: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  try {
    const order = await createOrder({
      amount: 49900,
      currency: "INR",
      receipt: "rcpt_demo_" + Date.now(),
      notes: { source: "landing-demo", mode: PSP_MODE },
    });
    return NextResponse.json({ id: order.id, amount: order.amount, mode: PSP_MODE }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server_error" }, { status: 500 });
  }
}
