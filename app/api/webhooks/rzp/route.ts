import { NextRequest, NextResponse } from "next/server";
import { verifyRzpWebhookSignature, RAZORPAY_WEBHOOK_SECRET } from "@/lib/razorpay";
import { syncRzpPayment, createRefund } from "@/lib/gateway";

// POST /api/webhooks/rzp — Razorpay webhook receiver.
// Configure this URL as your webhook endpoint in the Razorpay dashboard.
// Every request carries X-Razorpay-Signature = HMAC-SHA256(webhook_secret, raw body).
// We verify before touching any state, then sync the event into the local store.
export async function POST(req: NextRequest) {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "webhook_secret_not_configured" }, { status: 503 });
  }
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  if (!verifyRzpWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "signature_mismatch" }, { status: 400 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const event = String(payload.event ?? "");
  const entity = payload.payload?.payment?.entity ?? payload.payload?.refund?.entity ?? null;

  try {
    if (event.startsWith("payment.") && entity) {
      await syncRzpPayment(entity);
    } else if (event === "refund.processed" && entity) {
      await createRefund({
        payment_id: entity.payment_id,
        amount: entity.amount,
        speed: entity.speed,
      });
    }
    return NextResponse.json({ received: true, event }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server_error" }, { status: 500 });
  }
}
