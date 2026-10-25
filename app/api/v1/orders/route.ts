import { NextRequest, NextResponse } from "next/server";
import { createOrder, listOrders } from "@/lib/gateway";
import { requireAuth } from "@/lib/auth";

// POST /api/v1/orders — create an order server-side (documented contract)
export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    if (!body || typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json({ error: "amount must be a positive integer (smallest currency unit)" }, { status: 400 });
    }
    const order = await createOrder({
      amount: body.amount,
      currency: body.currency,
      receipt: body.receipt,
      notes: body.notes,
    });
    return NextResponse.json({ ...order }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server_error" }, { status: 500 });
  }
}

// GET /api/v1/orders?limit=&offset= — list orders
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  const sp = req.nextUrl.searchParams;
  const limit = Number(sp.get("limit") ?? 50);
  const offset = Number(sp.get("offset") ?? 0);
  const items = await listOrders(limit, offset);
  return NextResponse.json({ items, count: items.length });
}
