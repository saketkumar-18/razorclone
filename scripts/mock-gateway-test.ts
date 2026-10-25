// End-to-end mock test of the GATEWAY live branches (Razorpay proxied via stub fetch),
// using the sqlite local store. Verifies: createOrder creates a real Razorpay order,
// syncRzpPayment mirrors webhook events, capture/refund proxy to Razorpay.
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
delete process.env.DATABASE_URL; // force sqlite store for the test

async function main() {
  const g = await import("../lib/gateway");

  // 1. createOrder in live mode → should call Razorpay and store the real order id
  const order = await g.createOrder({ amount: 74900, currency: "INR", receipt: "rcpt_gw_mock" });
  console.log("1. createOrder:", order.id.startsWith("order_mock") ? "PASS" : "FAIL", "| status:", order.status);

  // 2. simulate Razorpay webhook: payment.authorized then payment.captured
  mockPayments.set("pay_gw1", { id: "pay_gw1", entity: "payment", amount: 74900, currency: "INR", status: "authorized", order_id: order.id, method: "upi", fee: 1498, tax: 270, captured: false, created_at: Date.now() / 1000 });
  console.log("2a. calling syncRzpPayment...");
  const synced = await g.syncRzpPayment(mockPayments.get("pay_gw1"));
  console.log("2b. sync returned:", synced?.status);

  // 3. capture through the gateway (live branch proxies to Razorpay)
  const cap = await g.capturePayment("pay_gw1");
  console.log("3. gateway capture:", cap.status === "captured" ? "PASS" : "FAIL", "| captured:", cap.captured);

  // 4. refund through the gateway
  const refund = await g.createRefund({ payment_id: "pay_gw1", amount: 10000 });
  console.log("4. gateway refund:", refund.status === "processed" ? "PASS" : "FAIL", "| amount:", refund.amount);

  // 5. order state updated to paid after capture
  const o2 = await g.getOrder(order.id);
  console.log("5. order state after capture:", o2.status === "paid" ? "PASS" : "FAIL", "|", o2.status);

  // 6. getPayment in live mode fetches from Razorpay and syncs
  const p2 = await g.getPayment("pay_gw1");
  console.log("6. getPayment live fetch:", p2.status === "captured" ? "PASS" : "FAIL");

  // 7. simulator guard: processPayment must refuse in live mode
  const blocked = await g.processPayment({ order_id: order.id, method: "card", email: "x@y.com", card: { number: "4100 2800 0000 1007", name: "X", expiry: "12/28", cvv: "123" } });
  console.log("7. processPayment blocked in live:", blocked.error === "live_mode_use_razorpay_checkout" ? "PASS" : "FAIL");
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
