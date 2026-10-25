import { NextRequest, NextResponse } from "next/server";
import { createRefund, listRefunds } from "@/lib/gateway";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.payment_id) {
      return NextResponse.json({ error: "payment_id is required" }, { status: 400 });
    }
    const res = createRefund({
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

export async function GET() {
  return NextResponse.json({ items: listRefunds() });
}
