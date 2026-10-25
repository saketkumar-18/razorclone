import { NextRequest, NextResponse } from "next/server";
import { listPayments, getPayment } from "@/lib/gateway";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  const sp = req.nextUrl.searchParams;
  const limit = Number(sp.get("limit") ?? 100);
  const offset = Number(sp.get("offset") ?? 0);
  const status = sp.get("status") ?? undefined;
  const items = await listPayments(limit, offset, status);
  return NextResponse.json({ items, count: items.length });
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  const body = await req.json().catch(() => null);
  const id = body?.payment_id;
  const p = id ? await getPayment(id) : null;
  return p
    ? NextResponse.json({ ...p })
    : NextResponse.json({ error: "payment_not_found" }, { status: 404 });
}
