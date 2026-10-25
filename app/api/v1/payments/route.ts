import { NextRequest, NextResponse } from "next/server";
import { listPayments, getPayment } from "@/lib/gateway";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Number(sp.get("limit") ?? 100);
  const offset = Number(sp.get("offset") ?? 0);
  const status = sp.get("status") ?? undefined;
  const items = listPayments(limit, offset, status);
  return NextResponse.json({ items, count: items.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.payment_id;
  const p = id ? getPayment(id) : null;
  return p
    ? NextResponse.json({ ...p })
    : NextResponse.json({ error: "payment_not_found" }, { status: 404 });
}
