#!/usr/bin/env node
/**
 * Webhook registration note:
 *
 * Razorpay's webhook CREATE API (/v1/webhooks) is only available for partner
 * / sub-merchant (route) accounts. For a regular merchant account — like the one
 * this gateway runs on — webhooks are configured in the dashboard:
 *
 *   Razorpay Dashboard → Settings → Webhooks → Add Webhook
 *     URL:    https://razorclone.vercel.app/api/webhooks/rzp
 *     Events: payment.authorized, payment.captured, payment.failed, refund.processed
 *     Secret: the RAZORPAY_WEBHOOK_SECRET value from your env
 *
 * Webhooks are OPTIONAL for taking payments: /api/checkout/confirm already syncs
 * each real payment by fetching it from Razorpay at checkout time, and getPayment
 * does the same on read. Webhooks only add async dashboard updates (e.g. refunds
 * issued directly in the Razorpay dashboard). The receiver endpoint is ready and
 * HMAC-verified; just point the dashboard webhook at it when you want that.
 */
console.log(`
Webhooks for this merchant account are set up in the Razorpay DASHBOARD
(Settings → Webhooks), not via this API — Razorpay restricts the webhook API
to partner/sub-merchant accounts. See the comments in this file.

The gateway already works without webhooks: every payment is synced from
Razorpay at checkout-confirm time and on read.
`);
