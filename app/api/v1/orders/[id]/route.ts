import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/gateway";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  return NextResponse.json({ ...order });
}
