#!/usr/bin/env node
/**
 * Register RazorClone's webhook endpoint on your Razorpay account via their API.
 * Run once after setting RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET, before taking
 * live payments — otherwise the dashboard won't see real payments arrive.
 *
 * Usage:
 *   RAZORPAY_KEY_ID=rzp_live_xxx RAZORPAY_KEY_SECRET=xxx \
 *   RAZORPAY_WEBHOOK_SECRET=whsec_xxx \
 *   BASE_URL=https://razorclone.vercel.app \
 *   node scripts/register-webhook.mjs
 */
const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const WH_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";
const BASE_URL = process.env.BASE_URL || "https://razorclone.vercel.app";

if (!KEY_ID || !KEY_SECRET || !WH_SECRET) {
  console.error("Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET.");
  process.exit(1);
}

const auth = "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
const url = `${BASE_URL}/api/webhooks/rzp`;
const events = ["payment.authorized", "payment.captured", "payment.failed", "refund.processed"];

const res = await fetch("https://api.razorpay.com/v1/webhooks", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: auth },
  body: JSON.stringify({ url, events, secret: WH_SECRET }),
});
const data = await res.json().catch(() => ({}));
if (res.ok) {
  console.log("Webhook registered:", data.id);
  console.log("  URL:", url);
  console.log("  Events:", events.join(", "));
} else {
  // 400 with "already exists" or a different failure — surface it
  console.error("Failed:", res.status, JSON.stringify(data));
  process.exit(1);
}
