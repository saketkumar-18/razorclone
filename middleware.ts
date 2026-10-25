import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_ORIGINS } from "@/lib/config";

// CORS middleware for /api/* — lets your other apps call the gateway cross-origin.
// ALLOWED_ORIGINS env: comma-separated origins, or * for any (default).
export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api")) return NextResponse.next();

  const origin = req.headers.get("origin") || "";
  const allowAll = ALLOWED_ORIGINS.includes("*");
  const allowed = allowAll || (origin && ALLOWED_ORIGINS.includes(origin));

  // Preflight
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    if (allowed) {
      res.headers.set("Access-Control-Allow-Origin", allowAll ? "*" : origin);
      res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Razorpay-Signature");
      res.headers.set("Access-Control-Max-Age", "86400");
    }
    return res;
  }

  const res = NextResponse.next();
  if (allowed) {
    res.headers.set("Access-Control-Allow-Origin", allowAll ? "*" : origin);
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
