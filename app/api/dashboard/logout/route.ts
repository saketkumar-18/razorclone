import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

// POST /api/dashboard/logout — clear the session cookie
export async function POST() {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/dashboard/login", process.env.APP_BASE_URL || "http://localhost:3000"), { status: 303 });
}
