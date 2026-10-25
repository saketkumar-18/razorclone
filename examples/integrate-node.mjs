#!/usr/bin/env node
/**
 * RazorClone integration example (Node.js 18+, no dependencies).
 *
 * Connect your app to the gateway exactly like you would to Razorpay:
 *   1. your backend creates an order (Basic auth with your API keys)
 *   2. redirect the customer to the hosted checkout
 *   3. after they pay, verify the signature server-side before fulfilling
 *   4. capture / refund via the API when needed
 *
 * Run:
 *   BASE_URL=https://razorclone.vercel.app \
 *   KEY_ID=rzp_test_xxx \
 *   KEY_SECRET=xxx \
 *   node examples/integrate-node.mjs
 */
const BASE_URL = process.env.BASE_URL || "https://razorclone.vercel.app";
const KEY_ID = process.env.KEY_ID || "";
const KEY_SECRET = process.env.KEY_SECRET || "";

const auth = "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// 1. Create an order server-side (amount in smallest currency unit: 49900 = ₹499.00)
const order = await api("/api/v1/orders", {
  method: "POST",
  body: {
    amount: 49900, // ₹499.00
    currency: "INR",
    receipt: `rcpt_${Date.now()}`,
    notes: { order_id: "your-app-order-123", customer: "rahul@example.com" },
  },
});
console.log("1. Order created:", order.id, "| status:", order.status);

// 2. Send your customer here (open in a browser):
console.log("2. Checkout URL for your customer:");
console.log(`   ${BASE_URL}/checkout/${order.id}`);
console.log("   (test card: 4100 2800 0000 1007, any CVV, future expiry)");

// 3. After the customer pays, fetch the order to see its state.
//    (In a real integration you'd also get a webhook to /api/webhooks/rzp.)
console.log("3. After payment, poll the order:");
let orderState = await api(`/api/v1/orders/${order.id}`);
console.log("   order status:", orderState.status);

// 4. If you captured the payment id from the checkout success screen,
//    verify the signature server-side before fulfilling:
//      payload = "{order_id}|{payment_id}"
//      POST /api/v1/utils/verify-signature  → {"valid": true|false}
console.log("4. Verify signature server-side before fulfilling (see README).");
console.log("Done.");
