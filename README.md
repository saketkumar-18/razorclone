# RazorClone — a Razorpay-style Payment Gateway Simulator

A functional clone of Razorpay's payment platform, built by reverse-engineering the
public product surface with **REA** ([morluto/rea](https://github.com/morluto/rea) —
Reverse Engineer Anything). The investigation phase observed the real product's
public site and documentation; the recreation phase rebuilt the observed behavior
in our own stack. **No Razorpay code or assets are used — this is an original
implementation. All payments are simulated; no real money moves.**

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- `node:sqlite` (built into Node 26) — zero native dependencies, single-file DB at `data/razorpay-clone.db`

## Run

```bash
npm install
npm run build
npm run start -- -p 3000
```

Open http://localhost:3000. The DB seeds itself with a demo merchant, test API keys,
and ~28 payments on first boot.

## Live (deployed)

- **https://razorclone.vercel.app** — free Vercel (Hobby) + Neon Postgres
- Postgres backend is used automatically when `DATABASE_URL` is set; otherwise the app
  falls back to local `node:sqlite` for development.
- Free-tier notes: serverless cold starts on first request after idle; the Neon free
  database persists your orders/payments across deploys.

### Using it as a payment gateway in your own app

```bash
# 1. Create an order from your backend
curl -X POST https://razorclone.vercel.app/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"amount": 49900, "currency": "INR", "receipt": "rcpt_001", "notes": {"order": "from-my-app"}}'
# → {"id":"order_...","status":"created",...}

# 2. Redirect your customer to the hosted checkout
#    https://razorclone.vercel.app/checkout/{order_id}

# 3. After payment, verify the signature server-side (never trust the client alone)
curl -X POST https://razorclone.vercel.app/api/v1/utils/verify-signature \
  -H "Content-Type: application/json" \
  -d '{"payload": "{order_id}|{payment_id}", "signature": "{razorpay_signature}"}'
# → {"valid":true}
```

**Remember:** without Razorpay keys configured this is a simulator — payments are mock,
customers are never charged. Add your real keys to take live payments (below).

## Connect your app — free, no charges to anyone

If you don't want to charge anyone (demo apps, prototypes, internal tools, college
projects), you're done — **stay in simulator mode**. It is 100% free, needs no
Razorpay account, no KYC, no fees, and your apps integrate exactly like the real thing.

Your API credentials are on the dashboard (https://razorclone.vercel.app/dashboard →
**API Keys**; password = `DASHBOARD_PASSWORD`, see `C:/Users/devil/Documents/razorpay-clone-deploy-secrets.txt`).

**Ready-to-run example clients** (copy into your app):

```bash
# Node.js
BASE_URL=https://razorclone.vercel.app KEY_ID=<your_key_id> KEY_SECRET=<your_key_secret> \
  node examples/integrate-node.mjs

# Python
BASE_URL=https://razorclone.vercel.app KEY_ID=<your_key_id> KEY_SECRET=<your_key_secret> \
  python3 examples/integrate-python.py
```

The 4-step flow every app uses (create order → hosted checkout → verify → capture/refund):

```bash
# 1. create an order (Basic auth = key_id:key_secret)
curl -X POST https://razorclone.vercel.app/api/v1/orders \
  -u <key_id>:<key_secret> -H "Content-Type: application/json" \
  -d '{"amount": 49900, "currency": "INR", "receipt": "rcpt_001", "notes": {"order": "from-my-app"}}'

# 2. redirect your customer to:
#    https://razorclone.vercel.app/checkout/<order_id>

# 3. after payment, verify server-side before fulfilling:
curl -X POST https://razorclone.vercel.app/api/v1/utils/verify-signature \
  -u <key_id>:<key_secret> -H "Content-Type: application/json" \
  -d '{"payload": "<order_id>|<payment_id>", "signature": "<razorpay_signature>"}'
# → {"valid":true}

# 4. capture / refund
curl -X POST https://razorclone.vercel.app/api/v1/payments/<payment_id>/capture -u <key_id>:<key_secret>
curl -X POST https://razorclone.vercel.app/api/v1/refunds \
  -u <key_id>:<key_secret> -H "Content-Type: application/json" \
  -d '{"payment_id": "<payment_id>", "amount": 24950}'
```

Test cards (from Razorpay's docs, work in simulator mode): Visa `4100 2800 0000 1007`,
Mastercard `5555 5100 0008 1006`, RuPay `6527 6589 0000 1005`, Amex `3402 560004 01007`.
Cards starting `4000 0000 0000` simulate a decline. UPI IDs starting `fail@` simulate failure.

> **Dashboard password:** the merchant dashboard is now protected. The password is in
> `razorpay-clone-deploy-secrets.txt` (outside the repo) as `DASHBOARD_PASSWORD`.
> The public pages (home, checkout) and the payment API still need no login — only the
> dashboard (which shows your API keys) is gated.

## Going live with real payments (Razorpay)

This gateway proxies to **Razorpay's licensed infrastructure** when you configure your
keys. Card data goes straight to Razorpay's hosted checkout — it never touches this
server, so there's no PCI burden on your side. Settlements land in **your** Razorpay
merchant account.

### 1. Get keys (free)

1. Sign up at https://dashboard.razorpay.com (email + OTP; ~2 min).
2. You'll get **test mode keys** immediately: `rzp_test_...` (Key ID) and Key Secret.
   Test keys let you run the whole flow with test cards before going live.
3. For **live payments**, complete KYC in the dashboard (business details + bank
   account for settlements). Razorpay then issues `rzp_live_...` keys.

### 2. Configure (Vercel)

```bash
vercel env add RAZORPAY_KEY_ID production
vercel env add RAZORPAY_KEY_SECRET production
vercel env add RAZORPAY_WEBHOOK_SECRET production
vercel deploy --prod
```

- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — your Razorpay keys. The moment both are
  set, the gateway switches from simulator to **live mode**: orders are created on
  Razorpay, the checkout page opens Razorpay's hosted payment page, and webhooks drive
  the dashboard.
- `RAZORPAY_WEBHOOK_SECRET` — any long random string you choose (e.g. `openssl rand -hex 24`).
  Register the webhook **automatically via Razorpay's API** (no dashboard clicking):

```bash
RAZORPAY_KEY_ID=<key_id> RAZORPAY_KEY_SECRET=<key_secret> \
RAZORPAY_WEBHOOK_SECRET=<your_wh_secret> \
node scripts/register-webhook.mjs
```

  or set it manually in Razorpay Dashboard → Settings → Webhooks:
  URL `https://razorclone.vercel.app/api/webhooks/rzp`, events `payment.authorized`,
  `payment.captured`, `payment.failed`, `refund.processed`. Every webhook is
  HMAC-verified before we touch state.
- `ALLOWED_ORIGINS` (optional) — comma-separated origins allowed to call the API from
  browsers. Default `*`; set it to your app's origin(s) for production.

### 3. Integrate your app

```bash
# 1. your backend creates an order (Basic auth = key_id:key_secret, like real Razorpay)
curl -X POST https://razorclone.vercel.app/api/v1/orders \
  -u rzp_test_XXXX:your_key_secret \
  -H "Content-Type: application/json" \
  -d '{"amount": 49900, "currency": "INR", "receipt": "rcpt_001", "notes": {"order_id": "from-my-app"}}'

# 2. redirect your customer to the hosted checkout
#    https://razorclone.vercel.app/checkout/{order_id}

# 3. after payment, verify server-side before fulfilling (never trust the client alone)
curl -X POST https://razorclone.vercel.app/api/v1/utils/verify-signature \
  -u rzp_test_XXXX:your_key_secret \
  -H "Content-Type: application/json" \
  -d '{"payload": "{order_id}|{payment_id}", "signature": "{razorpay_signature}"}'
# → {"valid":true}

# 4. refunds, captures, lists — all under /api/v1 with the same Basic auth
curl -X POST https://razorclone.vercel.app/api/v1/refunds \
  -u rzp_test_XXXX:your_key_secret \
  -H "Content-Type: application/json" \
  -d '{"payment_id": "pay_XXXX", "amount": 24950}'
```

All `/api/v1/*` endpoints require Basic auth (your key id + key secret). Public pages
(checkout, dashboard) need no auth.

## What it recreates (observed evidence → clone)

| Observed (real Razorpay docs/site) | Recreated here |
|---|---|
| Brand tokens `#192839` / `#305EFF` / `#F0263C` / `#F8FAFC` | Same palette in `globals.css` |
| Payment lifecycle: order `created → attempted → paid`; payment `created → authorized/failed → captured` | `lib/gateway.ts` `processPayment` / `capturePayment` |
| Orders must be created server-side first; checkout ties `order_id` to the payment | `POST /api/v1/orders` then `/checkout/{order_id}` |
| Amounts in smallest currency subunit (paise) | `amount: 49900` = ₹499.00 |
| Checkout options: `key_id`, `amount`, `currency`, `handler` returns `razorpay_payment_id/order_id/signature`, `prefill` | Client `checkout.tsx` + `/api/checkout` |
| Signature verification: HMAC-SHA256 of `order_id\|payment_id` with key secret, constant-time compare | `verifySignature` in `lib/gateway.ts` + `POST /api/v1/utils/verify-signature` |
| Test cards (docs: test-card-details): Visa `4100 2800 0000 1007`, MC `5555 5100 0008 1006`, MC prepaid `5180 2872 0009 1001`, RuPay `6527 6589 0000 1005`, Diners `3608 280009 1007`, Amex `3402 560004 01007` | Same numbers in `lib/payment-methods.ts`; declined-prefix cards fail |
| Webhooks signed with HMAC; merchant verifies before trusting | `fireWebhook` + `POST /api/v1/webhooks` |
| ID formats `order_*`, `pay_*`, `refund_*`, `cust_*`, `rzp_test_*` | Same prefixes |
| Dashboard: Overview / Payments / Orders / Refunds / Customers / API Keys / Settings | Dark-sidebar layout under `/dashboard` |

## End-to-end flow (verified live)

```bash
# 1. Create an order server-side
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"amount": 49900, "currency": "INR", "receipt": "rcpt_001"}'
# → {"id":"order_...","status":"created",...}

# 2. Pay on the hosted checkout → http://localhost:3000/checkout/{order_id}
#    Use the documented test cards; the payment comes back `authorized`
#    with a razorpay_signature.

# 3. Verify the signature server-side (constant-time)
curl -X POST http://localhost:3000/api/v1/utils/verify-signature \
  -H "Content-Type: application/json" \
  -d '{"payload": "{order_id}|{payment_id}", "signature": "{razorpay_signature}"}'
# → {"valid":true}  (tampered signatures → false)

# 4. Capture → order becomes paid, payment.captured webhook fires
curl -X POST http://localhost:3000/api/v1/payments/{payment_id}/capture

# 5. Refund → refund.processed webhook fires
curl -X POST http://localhost:3000/api/v1/refunds \
  -H "Content-Type: application/json" \
  -d '{"payment_id": "{payment_id}", "amount": 24950}'
```

## API surface

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/v1/orders` | Create order (amount in paise, currency, receipt, notes) |
| GET | `/api/v1/orders` `/api/v1/orders/[id]` | List / fetch orders |
| POST | `/api/checkout` | Process a payment on an order (card/upi/netbanking/wallet/emi/qr) |
| GET | `/api/v1/payments` `/api/v1/payments/[id]` | List / fetch payments |
| POST | `/api/v1/payments/[id]/capture` | Capture an authorized payment |
| POST | `/api/v1/refunds` | Create a refund |
| POST | `/api/v1/utils/verify-signature` | Verify `order_id\|payment_id` HMAC signature |
| GET/POST | `/api/v1/webhooks` | List webhook events / verify a webhook signature |

## Investigation evidence (REA workflow)

- Routing skill used: `rea/.agents/skills/reverse-engineer-anything/SKILL.md` (v49)
- Observation method: the browser CDP route was unavailable on this host (locked Chrome
  profile), so observation used HTTP capture of public pages: razorpay.com (brand tokens,
  product surface), docs.razorpay.com integration-steps (payment lifecycle table,
  checkout options contract, order-first rule), test-card-details (card numbers).
- Limitation: signature algorithm and lifecycle are reconstructed from the documented
  contract, not from the real binary (Razorpay is a SaaS; no binary exists to decompile).

## Scope / honesty

- **Simulator**: payment processing is deterministic mock logic, not a real gateway.
- No auth on the dashboard (demo); the real product's API-key auth pattern is shown but not enforced.
- No real money, no external calls, no user data leaves the machine.

## License

MIT — original code by Saket Kumar. "Razorpay" is a trademark of Razorpay Software Pvt. Ltd.; this project is an independent learning artifact and is not affiliated with or endorsed by Razorpay.
