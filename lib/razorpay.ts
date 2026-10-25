// Real Razorpay PSP adapter — proxied when live keys are configured.
// Documented API: https://razorpay.com/docs/api/orders etc.
// Auth: Basic base64(key_id:key_secret). Amounts in smallest currency subunit.
import {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
  PSP_MODE,
} from "./config";

const API = "https://api.razorpay.com/v1";

async function rzp<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as any)?.error?.description || `razorpay_${res.status}`);
    (err as any).status = res.status;
    (err as any).details = data;
    throw err;
  }
  return data as T;
}

// ---- Real Razorpay contract types (subset we use) ----
export interface RzpOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: "created" | "attempted" | "paid";
  notes: Record<string, string>;
  created_at: number;
}

export interface RzpPayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id: string | null;
  method: string;
  card_id?: string;
  email?: string;
  contact?: string;
  fee?: number;
  tax?: number;
  captured: boolean;
  error_code?: string;
  created_at: number;
}

export interface RzpRefund {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  payment_id: string;
  status: "pending" | "processed" | "failed";
  speed: string;
  created_at: number;
}

// ---- Orders ----
export async function createRzpOrder(input: {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, unknown>;
}): Promise<RzpOrder> {
  return rzp<RzpOrder>("POST", "/orders", {
    amount: Math.round(input.amount),
    currency: input.currency ?? "INR",
    receipt: input.receipt ?? undefined,
    notes: (input.notes ?? {}) as Record<string, string>,
  });
}

export async function getRzpOrder(id: string): Promise<RzpOrder> {
  return rzp<RzpOrder>("GET", `/orders/${id}`);
}

// ---- Payments ----
export async function getRzpPayment(id: string): Promise<RzpPayment> {
  return rzp<RzpPayment>("GET", `/payments/${id}`);
}

export async function captureRzpPayment(id: string, amount?: number): Promise<RzpPayment> {
  return rzp<RzpPayment>("POST", `/payments/${id}/capture`, { amount });
}

// ---- Refunds ----
export async function createRzpRefund(input: {
  payment_id: string;
  amount?: number;
  speed?: string;
  notes?: Record<string, unknown>;
}): Promise<RzpRefund> {
  return rzp<RzpRefund>("POST", "/refunds", {
    payment_id: input.payment_id,
    amount: input.amount,
    speed: input.speed,
    notes: input.notes,
  });
}

// ---- Webhook signature verification (documented: HMAC-SHA256 of raw body with webhook secret) ----
export function verifyRzpWebhookSignature(rawBody: string, signature: string): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) return false;
  const { createHmac, timingSafeEqual } = require("node:crypto");
  const expected = createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export { PSP_MODE, RAZORPAY_KEY_ID, RAZORPAY_WEBHOOK_SECRET };
