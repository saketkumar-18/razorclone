import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/gateway";
import { PSP_MODE, RAZORPAY_KEY_ID } from "@/lib/config";

// GET /api/checkout/config?order_id= — client-safe checkout bootstrap.
// Returns whether live mode is active and the PUBLIC key id (key_secret stays server-side).
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order_id");
  if (!orderId) return NextResponse.json({ error: "order_id required" }, { status: 400 });
  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  return NextResponse.json({
    mode: PSP_MODE,
    key_id: PSP_MODE === "live" ? RAZORPAY_KEY_ID : null,
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    status: order.status,
  });
}
