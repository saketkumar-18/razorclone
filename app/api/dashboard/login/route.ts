import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, setSessionCookie } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// POST /api/dashboard/login — password gate for the merchant dashboard
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", retry_after: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  try {
    const body = await req.json();
    const password = String(body?.password ?? "");
    if (!verifyPassword(password)) {
      // same-shape response for wrong password and unknown user
      return NextResponse.json({ error: "invalid_password" }, { status: 401 });
    }
    await setSessionCookie();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "invalid_password" }, { status: 401 });
  }
}
