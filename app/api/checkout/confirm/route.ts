import { NextRequest, NextResponse } from "next/server";
import { getOrder, getPayment, syncRzpPayment, verifySignature, getApiKey } from "@/lib/gateway";
import { PSP_MODE } from "@/lib/config";
import { getRzpPayment } from "@/lib/razorpay";

// POST /api/checkout/confirm — called after Razorpay's hosted checkout returns.
// The client sends razorpay_payment_id, razorpay_order_id, razorpay_signature;
// we verify the signature server-side (documented scheme) before trusting anything.
export async function POST(req: NextRequest) {
  try {
    if (PSP_MODE !== "live") {
      return NextResponse.json({ error: "not_live_mode" }, { status: 400 });
    }
    const body = await req.json();
    const { payment_id, order_id, signature } = body ?? {};
    if (!payment_id || !order_id || !signature) {
      return NextResponse.json({ error: "payment_id, order_id and signature are required" }, { status: 400 });
    }
    const order = await getOrder(order_id);
    if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

    const key = await getApiKey();
    if (!key) return NextResponse.json({ error: "no_api_key" }, { status: 500 });

    // signature = HMAC-SHA256(key_secret, order_id|payment_id)
    const valid = verifySignature(`${order_id}|${payment_id}`, key.key_secret, signature);
    if (!valid) {
      return NextResponse.json({ error: "signature_mismatch" }, { status: 400 });
    }

    // sync the real payment from Razorpay into our store
    const rzp = await getRzpPayment(payment_id);
    const synced = await syncRzpPayment(rzp);
    return NextResponse.json({ ...(synced ?? rzp), verified: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server_error" }, { status: 500 });
  }
}
