import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/gateway";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  return NextResponse.json({ ...order });
}
