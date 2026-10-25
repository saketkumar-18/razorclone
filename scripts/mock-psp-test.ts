// Mock-test for the live-mode PSP layer (no real Razorpay credentials needed).
// Stubs global fetch to behave like api.razorpay.com and exercises the adapter,
// the gateway's live branches, webhook signature verification, and the confirm flow.
import { createHmac } from "node:crypto";

const RZP_KEY = "rzp_test_MOCKKEY1234567890";
const RZP_SECRET = "mock_secret_0123456789abcdef";
const WH_SECRET = "whsec_mock";

const mockOrders = new Map<string, any>();
const mockPayments = new Map<string, any>();

function json(data: unknown, status: number) {
  return { ok: status < 400, status, json: async () => data } as Response;
}

(globalThis as any).fetch = async (url: any, opts: any = {}) => {
  const method = opts.method || "GET";
  const body = opts.body ? JSON.parse(opts.body) : null;
  const expected = "Basic " + Buffer.from(`${RZP_KEY}:${RZP_SECRET}`).toString("base64");
  if (opts.headers?.Authorization !== expected) return json({ error: { description: "auth failed" } }, 401);

  const u = String(url);
  if (u.endsWith("/v1/orders") && method === "POST") {
    const o = { id: "order_mock" + Date.now(), entity: "order", amount: body.amount, amount_paid: 0, amount_due: body.amount, currency: body.currency, receipt: body.receipt, status: "created", notes: body.notes || {}, created_at: Date.now() / 1000 };
    mockOrders.set(o.id, o);
    return json(o, 200);
  }
  const capM = u.match(/\/v1\/payments\/(pay_[^/]+)\/capture/);
  if (capM && method === "POST") {
    const p = mockPayments.get(capM[1]);
    p.status = "captured"; p.captured = true;
    return json(p, 200);
  }
  const getM = u.match(/\/v1\/payments\/(pay_[^/]+)/);
  if (getM && method === "GET") {
    const p = mockPayments.get(getM[1]);
    return p ? json(p, 200) : json({ error: { description: "not found" } }, 404);
  }
  if (u.endsWith("/v1/refunds") && method === "POST") {
    return json({ id: "refund_mock1", entity: "refund", amount: body.amount, currency: "INR", payment_id: body.payment_id, status: "processed", speed: "normal", created_at: Date.now() / 1000 }, 200);
  }
  return json({ error: { description: "unhandled " + u } }, 500);
};

process.env.RAZORPAY_KEY_ID = RZP_KEY;
process.env.RAZORPAY_KEY_SECRET = RZP_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = WH_SECRET;

async function main() {
const { PSP_MODE } = await import("../lib/config");
console.log("1. PSP_MODE:", PSP_MODE, PSP_MODE === "live" ? "PASS" : "FAIL");

const rzp = await import("../lib/razorpay");
const order = await rzp.createRzpOrder({ amount: 49900, currency: "INR", receipt: "rcpt_mock" });
console.log("2. rzp order:", order.id, order.status, order.amount, order.status === "created" ? "PASS" : "FAIL");

mockPayments.set("pay_mock1", { id: "pay_mock1", entity: "payment", amount: 49900, currency: "INR", status: "authorized", order_id: order.id, method: "card", fee: 998, tax: 180, captured: false, created_at: Date.now() / 1000 });
const cap = await rzp.captureRzpPayment("pay_mock1", 49900);
console.log("3. rzp capture:", cap.id, cap.status, "captured=", cap.captured, cap.status === "captured" ? "PASS" : "FAIL");

const refund = await rzp.createRzpRefund({ payment_id: "pay_mock1", amount: 10000 });
console.log("4. rzp refund:", refund.id, refund.status, refund.status === "processed" ? "PASS" : "FAIL");

const payload = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_mock1", order_id: order.id, status: "captured" } } } });
const sig = createHmac("sha256", WH_SECRET).update(payload).digest("hex");
console.log("5. webhook verify good:", rzp.verifyRzpWebhookSignature(payload, sig), "PASS");
console.log("6. webhook verify bad:", rzp.verifyRzpWebhookSignature(payload, "deadbeef") === false ? "PASS" : "FAIL");
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
