import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { initStore, run, get, all, USE_PG } from "./store";
import { getMerchant, getApiKey, genId, now } from "./db";
import { PSP_MODE, RAZORPAY_KEY_ID } from "./config";
import {
  createRzpOrder,
  getRzpOrder,
  getRzpPayment,
  captureRzpPayment,
  createRzpRefund,
} from "./razorpay";
import {
  TEST_CARDS,
  NETBANKING_BANKS,
  WALLETS,
  EMI_BANKS,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "./payment-methods";

export {
  getMerchant,
  getApiKey,
  TEST_CARDS,
  NETBANKING_BANKS,
  WALLETS,
  EMI_BANKS,
  PAYMENT_METHODS,
  type PaymentMethod,
  USE_PG,
  PSP_MODE,
  RAZORPAY_KEY_ID,
};

// ---- ID formats observed on the real product ----
export const orderId = () => genId("order");
export const paymentId = () => genId("pay");
export const refundId = () => genId("refund");
export const customerId = () => genId("cust");

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

// ---- Order creation ----
// Live mode: order is created on Razorpay's side (the licensed PSP) and mirrored locally.
// Simulator mode: order is created in our local store only.
export async function createOrder(input: {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, unknown>;
}): Promise<any> {
  const merchant = await getMerchant();
  if (!merchant) throw new Error("no_merchant");
  const t = now();
  const id = orderId();
  const localNotes = JSON.stringify(input.notes ?? {});

  if (PSP_MODE === "live") {
    const rzp = await createRzpOrder({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    });
    await run(
      `INSERT INTO orders (id, merchant_id, amount, currency, receipt, notes, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [rzp.id, merchant.id, rzp.amount, rzp.currency, rzp.receipt ?? input.receipt ?? null, localNotes, rzp.status, t, t]
    );
    return getOrder(rzp.id);
  }

  await run(
    `INSERT INTO orders (id, merchant_id, amount, currency, receipt, notes, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, merchant.id, Math.round(input.amount), input.currency ?? "INR", input.receipt ?? null, localNotes, "created", t, t]
  );
  return getOrder(id);
}

export async function getOrder(id: string): Promise<any> {
  await initStore();
  const row = await get("SELECT * FROM orders WHERE id = ?", [id]);
  if (!row) return null;
  return { ...row, notes: JSON.parse(String(row.notes || "{}")) };
}

export async function listOrders(limit = 50, offset = 0): Promise<any[]> {
  const rows = await all("SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?", [limit, offset]);
  return rows.map((r) => ({ ...r, notes: JSON.parse(String(r.notes || "{}")) }));
}

// ---- Payment processing ----
// Simulator: deterministic mock processing with documented test cards.
// Live mode: customers pay on Razorpay's hosted checkout (checkout.js); this function
// is not used for live payments — the webhook receiver syncs real payments instead.
export async function processPayment(input: {
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
}): Promise<any> {
  if (PSP_MODE === "live") {
    return { error: "live_mode_use_razorpay_checkout" };
  }

  const merchant = await getMerchant();
  const order = await getOrder(input.order_id);
  if (!merchant || !order) return { error: "order_not_found" };
  if (order.status === "paid") return { error: "order_already_paid" };

  const key = await getApiKey();
  const t = now();
  const pid = paymentId();

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

  const custEmail = input.email || "customer@example.com";
  const existing = (await get("SELECT id FROM customers WHERE merchant_id = ? AND email = ?", [merchant.id, custEmail])) as any;
  const cid = existing?.id ?? customerId();
  if (!existing) {
    await run(
      "INSERT INTO customers (id, merchant_id, name, email, contact, created_at) VALUES (?,?,?,?,?,?)",
      [cid, merchant.id, input.card?.name ?? custEmail.split("@")[0], custEmail, input.contact ?? null, t]
    );
  }

  const signature = status === "authorized" ? generateSignature(`${input.order_id}|${pid}`, key?.key_secret ?? "") : null;

  await run(
    `INSERT INTO payments (id, merchant_id, order_id, amount, currency, status, method, card_last4, card_network, upi_id, bank, wallet, email, contact, description, fee, tax, captured, razorpay_signature, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [pid, merchant.id, input.order_id, order.amount, order.currency, status, input.method,
     card_last4, card_network, upi_id, bank, wallet, custEmail, input.contact ?? null,
     input.description ?? order.receipt ?? null, fee, tax, 0, signature, t, t]
  );

  await run("UPDATE orders SET status = 'attempted', updated_at = ? WHERE id = ?", [t, input.order_id]);
  if (status === "authorized") {
    await fireWebhook("payment.authorized", { id: pid, order_id: input.order_id, amount: order.amount, method: input.method, status });
  } else {
    await fireWebhook("payment.failed", { id: pid, order_id: input.order_id, amount: order.amount, method: input.method, status, error_code: "BAD_REQUEST_ERROR" });
  }

  return getPayment(pid);
}

// ---- Live-mode helpers ----
// Sync a real Razorpay payment into the local store (called from the webhook receiver).
export async function syncRzpPayment(payment: any): Promise<any> {
  const merchant = await getMerchant();
  if (!merchant) return null;
  const orderId = payment.order_id;
  const t = now();
  const existing = (await get("SELECT id FROM payments WHERE id = ?", [payment.id])) as any;

  const fee = Number(payment.fee ?? 0);
  const tax = Number(payment.tax ?? 0);
  const captured = payment.captured ? 1 : 0;
  const method = payment.method ?? "unknown";
  const email = payment.email ?? null;
  const contact = payment.contact ?? null;
  const status = payment.status ?? "created";

  if (!existing) {
    await run(
      `INSERT INTO payments (id, merchant_id, order_id, amount, currency, status, method, card_last4, email, contact, description, fee, tax, captured, razorpay_signature, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [payment.id, merchant.id, orderId, payment.amount, payment.currency, status, method,
       payment.card_id ? payment.card_id.slice(-4) : null, email, contact, null, fee, tax, captured,
       null, payment.created_at * 1000, t]
    );
    // auto-create customer
    if (email) {
      const existingCust = (await get("SELECT id FROM customers WHERE merchant_id = ? AND email = ?", [merchant.id, email])) as any;
      if (!existingCust) {
        await run(
          "INSERT INTO customers (id, merchant_id, name, email, contact, created_at) VALUES (?,?,?,?,?,?)",
          [customerId(), merchant.id, null, email, contact, t]
        );
      }
    }
  } else {
    await run(
      "UPDATE payments SET status = ?, captured = ?, fee = ?, tax = ?, updated_at = ? WHERE id = ?",
      [status, captured, fee, tax, t, payment.id]
    );
  }

  // order state
  if (orderId) {
    const order = await getOrder(orderId);
    if (order) {
      const orderStatus = status === "captured" ? "paid" : status === "authorized" ? "attempted" : status === "failed" ? "attempted" : order.status;
      await run("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", [orderStatus, t, orderId]);
    }
  }

  // return the local row directly (do NOT call getPayment — that would recurse)
  const local = await get("SELECT * FROM payments WHERE id = ?", [payment.id]);
  if (!local) return null;
  const localRefunds = await all("SELECT * FROM refunds WHERE payment_id = ?", [payment.id]);
  return { ...local, refunds: localRefunds };
}

// ---- Capture ----
export async function capturePayment(paymentId: string): Promise<any> {
  if (PSP_MODE === "live") {
    const p = await getRzpPayment(paymentId);
    if (p.status !== "authorized") return { error: "payment_not_authorized" };
    const captured = await captureRzpPayment(paymentId, p.amount);
    await syncRzpPayment(captured);
    return getPayment(paymentId);
  }

  const row = (await get("SELECT * FROM payments WHERE id = ?", [paymentId])) as any;
  if (!row) return { error: "payment_not_found" };
  if (row.status !== "authorized") return { error: "payment_not_authorized" };
  const t = now();
  await run("UPDATE payments SET status = 'captured', captured = 1, updated_at = ? WHERE id = ?", [t, paymentId]);
  await run("UPDATE orders SET status = 'paid', updated_at = ? WHERE id = ?", [t, row.order_id]);
  await fireWebhook("payment.captured", { id: paymentId, order_id: row.order_id, amount: row.amount, method: row.method, status: "captured" });
  return getPayment(paymentId);
}

// ---- Refunds ----
export async function createRefund(input: { payment_id: string; amount?: number; speed?: string; notes?: Record<string, unknown> }): Promise<any> {
  if (PSP_MODE === "live") {
    const rzp = await createRzpRefund({
      payment_id: input.payment_id,
      amount: input.amount,
      speed: input.speed,
      notes: input.notes,
    });
    const merchant = await getMerchant();
    const t = now();
    await run(
      `INSERT INTO refunds (id, merchant_id, payment_id, amount, currency, status, speed, notes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [rzp.id, merchant.id, rzp.payment_id, rzp.amount, rzp.currency, rzp.status, rzp.speed, JSON.stringify(input.notes ?? {}), rzp.created_at * 1000, t]
    );
    await run("UPDATE payments SET status = 'refunded', updated_at = ? WHERE id = ?", [t, rzp.payment_id]);
    return get("SELECT * FROM refunds WHERE id = ?", [rzp.id]);
  }

  const row = (await get("SELECT * FROM payments WHERE id = ?", [input.payment_id])) as any;
  if (!row) return { error: "payment_not_found" };
  const amount = input.amount ?? row.amount;
  if (amount > row.amount) return { error: "refund_amount_exceeds_payment" };
  const t = now();
  const rid = refundId();
  await run(
    `INSERT INTO refunds (id, merchant_id, payment_id, amount, currency, status, speed, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [rid, row.merchant_id, input.payment_id, amount, row.currency, "processed", input.speed ?? "normal", JSON.stringify(input.notes ?? {}), t, t]
  );
  await run("UPDATE payments SET status = 'refunded', updated_at = ? WHERE id = ?", [t, input.payment_id]);
  await fireWebhook("refund.processed", { id: rid, payment_id: input.payment_id, amount, status: "processed" });
  return get("SELECT * FROM refunds WHERE id = ?", [rid]);
}

export async function getPayment(id: string): Promise<any> {
  await initStore();
  if (PSP_MODE === "live") {
    try {
      const p = await getRzpPayment(id);
      await syncRzpPayment(p);
    } catch {
      // fall through to local row if the Razorpay fetch fails (e.g. old sim payment)
    }
  }
  const row = await get("SELECT * FROM payments WHERE id = ?", [id]);
  if (!row) return null;
  const refunds = await all("SELECT * FROM refunds WHERE payment_id = ?", [id]);
  return { ...row, refunds };
}

export async function listPayments(limit = 100, offset = 0, status?: string): Promise<any[]> {
  const q = status
    ? "SELECT * FROM payments WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    : "SELECT * FROM payments ORDER BY created_at DESC LIMIT ? OFFSET ?";
  const rows = status ? await all(q, [status, limit, offset]) : await all(q, [limit, offset]);
  return rows;
}

export async function listRefunds(limit = 100, offset = 0): Promise<any[]> {
  return all("SELECT * FROM refunds ORDER BY created_at DESC LIMIT ? OFFSET ?", [limit, offset]);
}

export async function listCustomers(limit = 100, offset = 0): Promise<any[]> {
  return all("SELECT * FROM customers ORDER BY created_at DESC LIMIT ? OFFSET ?", [limit, offset]);
}

// ---- Webhook simulation (local events log; live mode uses Razorpay's own webhooks) ----
export async function fireWebhook(event: string, entity: Record<string, unknown>): Promise<void> {
  const merchant = await getMerchant();
  const key = await getApiKey();
  if (!merchant || !key) return;
  const payload = JSON.stringify({ event, entity, account_id: merchant.id, created_at: now() });
  const signature = generateSignature(payload, key.key_secret);
  const entityRef = String(entity.id ?? entity.payment_id ?? entity.order_id ?? "");
  await run(
    "INSERT INTO webhook_events (id, merchant_id, event, entity, payload, signature, delivered, created_at) VALUES (?,?,?,?,?,?,?,?)",
    [genId("evt"), merchant.id, event, entityRef, payload, signature, 1, now()]
  );
}

export async function listWebhookEvents(limit = 50, offset = 0): Promise<any[]> {
  return all("SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT ? OFFSET ?", [limit, offset]);
}
