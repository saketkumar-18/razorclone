import { NextRequest, NextResponse } from "next/server";
import { getPayment } from "@/lib/gateway";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  const { id } = await params;
  const p = await getPayment(id);
  if (!p) return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  return NextResponse.json({ ...p });
}
