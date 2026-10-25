import { NextRequest, NextResponse } from "next/server";
import { verifySignature, getApiKey } from "@/lib/gateway";

// POST /api/v1/utils/verify-signature — documented signature check
// payload = "order_id|payment_id" | "payment_id|refund_id" etc.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payload, signature } = body ?? {};
    if (!payload || !signature) {
      return NextResponse.json({ error: "payload and signature are required" }, { status: 400 });
    }
    const key = await getApiKey();
    if (!key) return NextResponse.json({ error: "no_api_key" }, { status: 500 });
    const valid = verifySignature(String(payload), key.key_secret, String(signature));
    return NextResponse.json({ valid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server_error" }, { status: 500 });
  }
}
