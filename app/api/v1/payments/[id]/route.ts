import { NextRequest, NextResponse } from "next/server";
import { getPayment } from "@/lib/gateway";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPayment(id);
  if (!p) return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  return NextResponse.json({ ...p });
}
