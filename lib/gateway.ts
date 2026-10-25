import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { db, genId, now, getMerchant, getApiKey } from "./db";
import {
  TEST_CARDS,
  NETBANKING_BANKS,
  WALLETS,
  EMI_BANKS,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "./payment-methods";

export { getMerchant, getApiKey, db, genId, now } from "./db";
export {
  TEST_CARDS,
  NETBANKING_BANKS,
  WALLETS,
  EMI_BANKS,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "./payment-methods";

// ---- ID formats observed on the real product ----
export const orderId = () => genId("order");
export const paymentId = () => genId("pay");
export const refundId = () => genId("refund");
export const customerId = () => genId("cust");

// ---- Test cards (documented in Razorpay docs: test-card-details) ----
// Declined test cards: any other number fails, plus explicit known-bad prefixes
const DECLINED_PREFIXES = ["4000 0000 0000", "4111 1111 1111", "4242 4242 4242"];

function cardNetwork(number: string): { network: string; type: string } | null {
  const digits = number.replace(/\s+/g, "");
  for (const c of TEST_CARDS) {
    if (c.number.replace(/\s+/g, "") === digits) return { network: c.network, type: c.type };
  }
  for (const p of DECLINED_PREFIXES) {
    if (digits.startsWith(p.replace(/\s+/g, ""))) {
      return { network: "Visa", type: "Credit" };
    }
  }
  // infer network by IIN for unknown cards
  if (/^4/.test(digits)) return { network: "Visa", type: "Credit" };
  if (/^5[1-5]/.test(digits)) return { network: "Mastercard", type: "Credit" };
  if (/^6/.test(digits)) return { network: "RuPay", type: "Credit" };
  if (/^3[47]/.test(digits)) return { network: "Amex", type: "Credit" };
  if (/^3[0689]/.test(digits)) return { network: "Diners", type: "Credit" };
  return { network: "Visa", type: "Credit" };
}

export function isTestCardDeclined(number: string): boolean {
  const digits = number.replace(/\s+/g, "");
  return DECLINED_PREFIXES.some((p) => digits.startsWith(p.replace(/\s+/g, "")));
}

// ---- Signature verification (documented scheme: HMAC-SHA256 of order_id|payment_id with key secret) ----
export function generateSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(payload: string, secret: string, signature: string): boolean {
  const expected = generateSignature(payload, secret);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---- Order creation (server-side first, per docs) ----
export function createOrder(input: {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, unknown>;
}) {
  const merchant = getMerchant();
  if (!merchant) throw new Error("no_merchant");
  const t = now();
  const id = orderId();
  db.prepare(
    `INSERT INTO orders (id, merchant_id, amount, currency, receipt, notes, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    merchant.id,
    Math.round(input.amount),
    input.currency ?? "INR",
    input.receipt ?? null,
    JSON.stringify(input.notes ?? {}),
    "created",
    t,
    t
  );
  return getOrder(id);
}

export function getOrder(id: string): any {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!row) return null;
  return { ...(row as object), notes: JSON.parse((row as any).notes || "{}") };
}

export function listOrders(limit = 50, offset = 0) {
  const rows = db
    .prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as Array<Record<string, unknown>>;
  return rows.map((r) => ({ ...r, notes: JSON.parse(String(r.notes || "{}")) }));
}

// ---- Payment processing (simulated) ----
export function processPayment(input: {
  order_id: string;
  method: PaymentMethod;
  card?: { number: string; expiry: string; cvv: string; name: string };
  upi_id?: string;
  bank?: string;
  wallet?: string;
  email?: string;
  contact?: string;
  description?: string;
  emi_tenure?: number;
}) {
  const merchant = getMerchant();
  const order = getOrder(input.order_id);
  if (!merchant || !order) return { error: "order_not_found" };
  if (order.status === "paid") return { error: "order_already_paid" };

  const key = getApiKey();
  const t = now();
  const pid = paymentId();

  // simulate outcome
  let status: "authorized" | "failed" = "authorized";
  let card_last4: string | null = null;
  let card_network: string | null = null;
  let upi_id = null as string | null;
  let bank = null as string | null;
  let wallet = null as string | null;
  let fee = 0;
  let tax = 0;

  if (input.method === "card" && input.card?.number) {
    const n = cardNetwork(input.card.number);
    card_last4 = input.card.number.replace(/\s+/g, "").slice(-4);
    card_network = n?.network ?? null;
    if (isTestCardDeclined(input.card.number)) status = "failed";
  } else if (input.method === "upi") {
    upi_id = input.upi_id ?? "customer@okhdfcbank";
    if (!input.upi_id || input.upi_id.startsWith("fail@")) status = "failed";
  } else if (input.method === "netbanking") {
    bank = input.bank ?? "HDFC Bank";
  } else if (input.method === "wallet") {
    wallet = input.wallet ?? "PhonePe";
  } else if (input.method === "emi") {
    bank = input.bank ?? "HDFC Bank";
  }

  if (status === "authorized") {
    fee = Math.round(order.amount * 0.02);
    tax = Math.round(fee * 0.18);
  }

  // customer upsert
  const custEmail = input.email || "customer@example.com";
  const existing = db
    .prepare("SELECT id FROM customers WHERE merchant_id = ? AND email = ?")
    .get(merchant.id, custEmail) as { id: string } | undefined;
  const cid = existing?.id ?? customerId();
  if (!existing) {
    db.prepare(
      "INSERT INTO customers (id, merchant_id, name, email, contact, created_at) VALUES (?,?,?,?,?,?)"
    ).run(cid, merchant.id, input.card?.name ?? custEmail.split("@")[0], custEmail, input.contact ?? null, t);
  }

  const signature = status === "authorized"
    ? generateSignature(`${input.order_id}|${pid}`, key?.key_secret ?? "")
    : null;

  db.prepare(
    `INSERT INTO payments (id, merchant_id, order_id, amount, currency, status, method, card_last4, card_network, upi_id, bank, wallet, email, contact, description, fee, tax, captured, razorpay_signature, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    pid, merchant.id, input.order_id, order.amount, order.currency, status, input.method,
    card_last4, card_network, upi_id, bank, wallet, custEmail, input.contact ?? null,
    input.description ?? order.receipt ?? null, fee, tax, status === "authorized" ? 0 : 0,
    signature, t, t
  );

  if (status === "authorized") {
    db.prepare("UPDATE orders SET status = 'attempted', updated_at = ? WHERE id = ?").run(t, input.order_id);
    fireWebhook("payment.authorized", { id: pid, order_id: input.order_id, amount: order.amount, method: input.method, status });
  } else {
    db.prepare("UPDATE orders SET status = 'attempted', updated_at = ? WHERE id = ?").run(t, input.order_id);
    fireWebhook("payment.failed", { id: pid, order_id: input.order_id, amount: order.amount, method: input.method, status, error_code: "BAD_REQUEST_ERROR" });
  }

  return getPayment(pid);
}

export function capturePayment(paymentId: string) {
  const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(paymentId) as any;
  if (!row) return { error: "payment_not_found" };
  if (row.status !== "authorized") return { error: "payment_not_authorized" };
  const t = now();
  db.prepare(
    "UPDATE payments SET status = 'captured', captured = 1, updated_at = ? WHERE id = ?"
  ).run(t, paymentId);
  db.prepare("UPDATE orders SET status = 'paid', updated_at = ? WHERE id = ?").run(t, row.order_id);
  fireWebhook("payment.captured", { id: paymentId, order_id: row.order_id, amount: row.amount, method: row.method, status: "captured" });
  return getPayment(paymentId);
}

export function createRefund(input: { payment_id: string; amount?: number; speed?: string; notes?: Record<string, unknown> }) {
  const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(input.payment_id) as any;
  if (!row) return { error: "payment_not_found" };
  const amount = input.amount ?? row.amount;
  if (amount > row.amount) return { error: "refund_amount_exceeds_payment" };
  const t = now();
  const rid = refundId();
  db.prepare(
    `INSERT INTO refunds (id, merchant_id, payment_id, amount, currency, status, speed, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(rid, row.merchant_id, input.payment_id, amount, row.currency, "processed", input.speed ?? "normal", JSON.stringify(input.notes ?? {}), t, t);
  db.prepare("UPDATE payments SET status = 'refunded', updated_at = ? WHERE id = ?").run(t, input.payment_id);
  fireWebhook("refund.processed", { id: rid, payment_id: input.payment_id, amount, status: "processed" });
  return db.prepare("SELECT * FROM refunds WHERE id = ?").get(rid);
}

export function getPayment(id: string) {
  const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(id) as any;
  if (!row) return null;
  const refunds = db.prepare("SELECT * FROM refunds WHERE payment_id = ?").all(id);
  return { ...row, refunds };
}

export function listPayments(limit = 100, offset = 0, status?: string) {
  const q = status
    ? db.prepare("SELECT * FROM payments WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
    : db.prepare("SELECT * FROM payments ORDER BY created_at DESC LIMIT ? OFFSET ?");
  const rows = status ? q.all(status, limit, offset) : q.all(limit, offset);
  return rows as Array<Record<string, unknown>>;
}

export function listRefunds(limit = 100, offset = 0) {
  return db
    .prepare("SELECT * FROM refunds ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as Array<Record<string, unknown>>;
}

export function listCustomers(limit = 100, offset = 0) {
  return db
    .prepare("SELECT * FROM customers ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as Array<Record<string, unknown>>;
}

// ---- Webhook simulation ----
export function fireWebhook(event: string, entity: Record<string, unknown>) {
  const merchant = getMerchant();
  const key = getApiKey();
  if (!merchant || !key) return;
  const payload = JSON.stringify({ event, entity, account_id: merchant.id, created_at: now() });
  const signature = generateSignature(payload, key.key_secret);
  const entityRef = String(entity.id ?? entity.payment_id ?? entity.order_id ?? "");
  db.prepare(
    "INSERT INTO webhook_events (id, merchant_id, event, entity, payload, signature, delivered, created_at) VALUES (?,?,?,?,?,?,?,?)"
  ).run(genId("evt"), merchant.id, event, entityRef, payload, signature, 1, now());
}

export function listWebhookEvents(limit = 50, offset = 0) {
  return db
    .prepare("SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as Array<Record<string, unknown>>;
}
