import { NextRequest, NextResponse } from "next/server";
import { processPayment, getOrder } from "@/lib/gateway";

// POST /api/checkout — invoked by the hosted checkout page to process a payment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const order = body?.order_id ? getOrder(body.order_id) : null;
    if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    const res = processPayment({
      order_id: body.order_id,
      method: body.method ?? "card",
      card: body.card,
      upi_id: body.upi_id,
      bank: body.bank,
      wallet: body.wallet,
      email: body.email,
      contact: body.contact,
      description: body.description,
      emi_tenure: body.emi_tenure,
    });
    if (res.error) return NextResponse.json(res, { status: 400 });
    return NextResponse.json({ ...res }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server_error" }, { status: 500 });
  }
}
