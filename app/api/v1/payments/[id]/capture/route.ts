import { NextRequest, NextResponse } from "next/server";
import { capturePayment, getPayment } from "@/lib/gateway";

// POST /api/v1/payments/:id/capture — capture an authorized payment
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await getPayment(id);
  if (!existing) return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  const res = await capturePayment(id);
  if ((res as any)?.error) return NextResponse.json(res, { status: 400 });
  return NextResponse.json({ ...res });
}
