import { NextRequest, NextResponse } from "next/server";
import { listWebhookEvents, getApiKey, generateSignature } from "@/lib/gateway";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  const sp = req.nextUrl.searchParams;
  const limit = Number(sp.get("limit") ?? 50);
  const items = await listWebhookEvents(limit);
  return NextResponse.json({ items, count: items.length });
}

// POST /api/v1/webhooks — verify an incoming webhook signature the way a merchant server would
export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { payload, signature } = body ?? {};
    const key = await getApiKey();
    if (!key) return NextResponse.json({ error: "no_api_key" }, { status: 500 });
    const expected = generateSignature(String(payload ?? ""), key.key_secret);
    const ok = expected === String(signature ?? "");
    return NextResponse.json({ valid: ok, expected });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server_error" }, { status: 500 });
  }
}
