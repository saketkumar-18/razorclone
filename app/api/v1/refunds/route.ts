import { NextRequest, NextResponse } from "next/server";
import { createRefund, listRefunds } from "@/lib/gateway";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    if (!body?.payment_id) {
      return NextResponse.json({ error: "payment_id is required" }, { status: 400 });
    }
    const res = await createRefund({
      payment_id: body.payment_id,
      amount: body.amount,
      speed: body.speed,
      notes: body.notes,
    });
    if (!res || (res as any).error) return NextResponse.json(res ?? { error: "refund_failed" }, { status: 400 });
    return NextResponse.json({ ...res }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server_error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  const items = await listRefunds();
  return NextResponse.json({ items });
}
