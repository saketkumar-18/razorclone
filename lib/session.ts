import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

// Dashboard session auth — password-gated with an HttpOnly, SameSite=Lax cookie.
// The password lives in DASHBOARD_PASSWORD (set in Vercel env). If unset, the
// dashboard stays open (local dev convenience) — production MUST set it.

const COOKIE_NAME = "rzp_dash_session";
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000; // 7 days

function hmac(value: string): string {
  const secret = process.env.DASHBOARD_PASSWORD || "dev-insecure";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function verifyPassword(password: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD || "";
  if (!expected) return true; // no gate configured
  const a = Buffer.from(expected);
  const b = Buffer.from(password);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSessionToken(): string {
  const token = randomBytes(24).toString("hex");
  const expires = String(Date.now() + SESSION_TTL_MS);
  return `${token}.${expires}.${hmac(`${token}.${expires}`)}`;
}

export function validateSessionToken(value: string | undefined): boolean {
  if (!value) return false;
  const [token, expires, sig] = value.split(".");
  if (!token || !expires || !sig) return false;
  const expected = hmac(`${token}.${expires}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(expires) > Date.now();
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return validateSessionToken(token);
}

export async function setSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
