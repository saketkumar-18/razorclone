import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "razorpay-clone.db");

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    mode TEXT NOT NULL DEFAULT 'test',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    key_id TEXT PRIMARY KEY,
    key_secret TEXT NOT NULL,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    name TEXT NOT NULL DEFAULT 'Default',
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    receipt TEXT,
    notes TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'created',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    order_id TEXT REFERENCES orders(id),
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created',
    method TEXT,
    card_last4 TEXT,
    card_network TEXT,
    upi_id TEXT,
    bank TEXT,
    wallet TEXT,
    email TEXT,
    contact TEXT,
    description TEXT,
    fee INTEGER DEFAULT 0,
    tax INTEGER DEFAULT 0,
    captured INTEGER NOT NULL DEFAULT 0,
    razorpay_signature TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    payment_id TEXT NOT NULL REFERENCES payments(id),
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending',
    speed TEXT DEFAULT 'normal',
    notes TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    event TEXT NOT NULL,
    entity TEXT NOT NULL,
    payload TEXT NOT NULL,
    signature TEXT NOT NULL,
    delivered INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    name TEXT,
    email TEXT,
    contact TEXT,
    created_at INTEGER NOT NULL
  );
`);

export const now = () => Date.now();
export const genId = (prefix: string) =>
  `${prefix}_${randomBytes(10).toString("hex")}`;

// ---- Seed ----
const seeded = db.prepare("SELECT COUNT(*) AS c FROM merchants").get() as {
  c: number;
};
if (seeded.c === 0) {
  const t = now();
  const mid = "merch_7f3c1a9b5e2d4f80";
  db.prepare(
    "INSERT INTO merchants (id, name, email, phone, mode, created_at) VALUES (?,?,?,?,?,?)"
  ).run(mid, "Acme Store", "merchant@acme-store.in", "+91 98765 43210", "test", t);

  const keyId = "rzp_test_" + randomBytes(10).toString("hex");
  const keySecret = randomBytes(20).toString("hex");
  db.prepare(
    "INSERT INTO api_keys (key_id, key_secret, merchant_id, name, active, created_at) VALUES (?,?,?,?,?,?)"
  ).run(keyId, keySecret, mid, "Default", 1, t);

  const insOrder = db.prepare(
    "INSERT INTO orders (id, merchant_id, amount, currency, receipt, notes, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)"
  );
  const insPay = db.prepare(
    `INSERT INTO payments (id, merchant_id, order_id, amount, currency, status, method, card_last4, card_network, upi_id, bank, wallet, email, contact, description, fee, tax, captured, razorpay_signature, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const insCust = db.prepare(
    "INSERT INTO customers (id, merchant_id, name, email, contact, created_at) VALUES (?,?,?,?,?,?)"
  );

  const custs = [
    ["cust_Nx7Q2mLk9vTe1w", "Rahul Sharma", "rahul.sharma@gmail.com", "+91 98100 11223"],
    ["cust_Kp4Rt8Zn2bXe6u", "Priya Patel", "priya.patel@outlook.com", "+91 99670 44556"],
    ["cust_Qz1Wm5Cj8fGs3h", "Amit Verma", "amit.verma@yahoo.com", "+91 98220 77889"],
    ["cust_Ad8Yk2Xn5qJm9o", "Sneha Iyer", "sneha.iyer@gmail.com", "+91 90040 33221"],
    ["cust_Lw6Bv3Rs9tYd4p", "Vikram Singh", "vikram.s@protonmail.com", "+91 99870 66554"],
  ];
  for (const c of custs) insCust.run(c[0], mid, c[1], c[2], c[3], t - 90 * 86400000);

  // ~28 seeded payments across statuses spread over 28 days
  const statuses: Array<[string, string, string | null, string | null]> = [
    ["captured", "card", "4100", "Visa"],
    ["captured", "card", "5555", "Mastercard"],
    ["captured", "upi", null, null],
    ["failed", "card", "4000", "Visa"],
    ["captured", "netbanking", null, null],
    ["refunded", "card", "5180", "Mastercard"],
    ["captured", "wallet", null, null],
    ["captured", "upi", null, null],
    ["failed", "upi", null, null],
    ["captured", "card", "6527", "RuPay"],
    ["captured", "netbanking", null, null],
    ["refunded", "card", "5555", "Mastercard"],
    ["captured", "card", "3402", "Amex"],
    ["captured", "upi", null, null],
    ["captured", "wallet", null, null],
    ["failed", "card", "4000", "Visa"],
    ["captured", "card", "4100", "Visa"],
    ["refunded", "upi", null, null],
    ["captured", "netbanking", null, null],
    ["captured", "card", "5555", "Mastercard"],
    ["captured", "upi", null, null],
    ["failed", "wallet", null, null],
    ["captured", "card", "5180", "Mastercard"],
    ["captured", "upi", null, null],
    ["refunded", "netbanking", null, null],
    ["captured", "card", "6527", "RuPay"],
    ["captured", "card", "4100", "Visa"],
    ["captured", "upi", null, null],
  ];

  const amounts = [99900, 149900, 29900, 499900, 79900, 199900, 59900, 124900, 39900, 74900, 259900, 99900, 179900, 44900, 89900, 64900, 129900, 34900, 54900, 119900, 69900, 39900, 159900, 89900, 249900, 44900, 109900, 79900];
  const methods = ["card", "upi", "netbanking", "wallet"];
  const descs = ["Premium Subscription", "Order #4821", "Grocery delivery", "Electronics order", "Fitness plan", "Course enrollment", "Food order", "Cab ride", "Cloud storage", "Design services"];

  for (let i = 0; i < statuses.length; i++) {
    const [st, method, last4, network] = statuses[i];
    const amt = amounts[i % amounts.length];
    const created = t - i * 86400000 - (i % 5) * 3600000;
    const oid = genId("order");
    const pid = genId("pay");
    const cust = custs[i % custs.length];
    const custName = cust[1];
    const desc = descs[i % descs.length];
    const email = cust[2];
    const contact = cust[3];
    const captured = st === "captured" || st === "refunded" ? 1 : 0;
    const fee = captured ? Math.round(amt * 0.02) : 0;
    const tax = Math.round(fee * 0.18);
    const upi = method === "upi" ? `customer${i}@okhdfcbank` : null;
    const bank = method === "netbanking" ? "HDFC Bank" : null;
    const wallet = method === "wallet" ? "PhonePe" : null;
    const orderStatus = st === "refunded" ? "paid" : st === "captured" ? "paid" : st === "failed" ? "attempted" : "created";

    insOrder.run(oid, mid, amt, "INR", `rcpt_${1000 + i}`, JSON.stringify({ customer: custName }), orderStatus, created, created + 60000);
    insPay.run(pid, mid, oid, amt, "INR", st, method, last4, network, upi, bank, wallet, email, contact, desc, fee, tax, captured, st === "captured" || st === "refunded" ? `sign_${randomBytes(8).toString("hex")}` : null, created, created + 60000);

    if (st === "refunded") {
      const rid = genId("refund");
      const rAmt = Math.round(amt * (i % 3 === 0 ? 1 : 0.5));
      db.prepare(
        "INSERT INTO refunds (id, merchant_id, payment_id, amount, currency, status, speed, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
      ).run(rid, mid, pid, rAmt, "INR", "processed", "normal", "{}", created + 3600000, created + 7200000);
    }
  }
}

export function getMerchant() {
  return db.prepare("SELECT * FROM merchants LIMIT 1").get() as {
    id: string;
    name: string;
    email: string;
    phone: string;
    mode: string;
  };
}

export function getApiKey() {
  return db
    .prepare("SELECT * FROM api_keys WHERE active = 1 ORDER BY created_at LIMIT 1")
    .get() as { key_id: string; key_secret: string } | undefined;
}
