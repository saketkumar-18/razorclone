import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getApiKey } from "./gateway";

// API-key auth for /api/v1/* — mirrors the real Razorpay scheme:
// Authorization: Basic base64(key_id:key_secret)
// The key_secret is only ever compared server-side (constant-time); it is never
// returned to clients.
export async function authenticateRequest(req: NextRequest): Promise<{ ok: boolean; error?: NextResponse }> {
  const header = req.headers.get("authorization") || "";
  const m = header.match(/^Basic\s+(.+)$/i);
  if (!m) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "authentication_required", hint: "Send Authorization: Basic base64(key_id:key_secret)" },
        { status: 401, headers: { "WWW-Authenticate": 'Basic realm="api"' } }
      ),
    };
  }
  let decoded: string;
  try {
    decoded = Buffer.from(m[1], "base64").toString("utf8");
  } catch {
    return { ok: false, error: NextResponse.json({ error: "invalid_credentials" }, { status: 401 }) };
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) {
    return { ok: false, error: NextResponse.json({ error: "invalid_credentials" }, { status: 401 }) };
  }
  const keyId = decoded.slice(0, idx);
  const secret = decoded.slice(idx + 1);
  const key = await getApiKey();
  if (!key || key.key_id !== keyId) {
    return { ok: false, error: NextResponse.json({ error: "invalid_credentials" }, { status: 401 }) };
  }
  const a = Buffer.from(key.key_secret);
  const b = Buffer.from(secret);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    return { ok: false, error: NextResponse.json({ error: "invalid_credentials" }, { status: 401 }) };
  }
  return { ok: true };
}

export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const result = await authenticateRequest(req);
  return result.ok ? null : result.error!;
}
