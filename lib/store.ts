import { Pool } from "pg";
import path from "node:path";
import fs from "node:fs";

// Dual-backend store: Postgres (Neon/Vercel) when DATABASE_URL is set,
// node:sqlite fallback for local development.
const usePg = !!process.env.DATABASE_URL;
export const USE_PG = usePg;

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.RZP_DB_PATH || path.join(DATA_DIR, "razorpay-clone.db");

type Row = Record<string, unknown>;

let pool: Pool | null = null;
let sqlite: any = null; // DatabaseSync instance
let ready: Promise<void> | null = null;

async function getSqlite() {
  if (!sqlite) {
    const { DatabaseSync } = await import("node:sqlite");
    sqlite = new DatabaseSync(DB_PATH);
  }
  return sqlite;
}

// Convert `?` positional placeholders to pg `$1,$2,...` (skips string literals)
export function toPgSql(sql: string): string {
  let n = 0;
  let out = "";
  let inStr = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'") {
      inStr = !inStr;
      out += c;
    } else if (c === "?" && !inStr) {
      n += 1;
      out += "$" + n;
    } else {
      out += c;
    }
  }
  return out;
}

// ---- Internal helpers: assume the store is already initialized (no initStore guard) ----
async function _run(sql: string, params: unknown[]): Promise<void> {
  if (usePg) {
    await pool!.query(toPgSql(sql), params);
  } else {
    const stmt = (await getSqlite()).prepare(sql);
    stmt.run(...params);
  }
}

async function _get(sql: string, params: unknown[]): Promise<Row | undefined> {
  if (usePg) {
    const res = await pool!.query(toPgSql(sql), params);
    return res.rows[0] as Row | undefined;
  }
  const stmt = (await getSqlite()).prepare(sql);
  return stmt.get(...params) as Row | undefined;
}

async function _all(sql: string, params: unknown[]): Promise<Row[]> {
  if (usePg) {
    const res = await pool!.query(toPgSql(sql), params);
    return res.rows as Row[];
  }
  const stmt = (await getSqlite()).prepare(sql);
  return stmt.all(...params) as Row[];
}

// ---- Public API: lazily initializes schema + seed on first use ----
export async function initStore(): Promise<void> {
  if (!ready) {
    ready = initInternal();
  }
  return ready;
}

async function initInternal(): Promise<void> {
  if (usePg) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch { /* read-only fs ok */ }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production" || String(process.env.DATABASE_URL).includes("neon")
          ? { rejectUnauthorized: false }
          : undefined,
      max: 4,
    });
    await schema();
  } else {
    await getSqlite();
    await schema();
  }
  await seed();
}

async function schema(): Promise<void> {
  if (usePg) {
    for (const stmt of splitStatements(SCHEMA)) {
      if (stmt.trim()) await pool!.query(stmt);
    }
  } else {
    const db = await getSqlite();
    if (process.env.RZP_DB_WAL !== "off") {
      try { db.exec("PRAGMA journal_mode = WAL;"); } catch { /* ignore */ }
    }
    try { db.exec("PRAGMA foreign_keys = ON;"); } catch { /* ignore */ }
    db.exec(SCHEMA);
  }
}

// ---- Seed (idempotent: only when merchants table is empty) ----
async function seed(): Promise<void> {
  const row = await _get("SELECT COUNT(*) AS c FROM merchants", []);
  if (Number((row as any)?.c ?? 0) > 0) return;

  const t = Date.now();
  const mid = "merch_7f3c1a9b5e2d4f80";
  await _run("INSERT INTO merchants (id, name, email, phone, mode, created_at) VALUES (?,?,?,?,?,?)", [
    mid, "Acme Store", "merchant@acme-store.in", "+91 98765 43210", "test", t,
  ]);

  const { randomBytes } = await import("node:crypto");
  const keyId = "rzp_test_" + randomBytes(10).toString("hex");
  const keySecret = randomBytes(20).toString("hex");
  await _run("INSERT INTO api_keys (key_id, key_secret, merchant_id, name, active, created_at) VALUES (?,?,?,?,?,?)", [
    keyId, keySecret, mid, "Default", 1, t,
  ]);

  const custs = [
    ["cust_Nx7Q2mLk9vTe1w", "Rahul Sharma", "rahul.sharma@gmail.com", "+91 98100 11223"],
    ["cust_Kp4Rt8Zn2bXe6u", "Priya Patel", "priya.patel@outlook.com", "+91 99670 44556"],
    ["cust_Qz1Wm5Cj8fGs3h", "Amit Verma", "amit.verma@yahoo.com", "+91 98220 77889"],
    ["cust_Ad8Yk2Xn5qJm9o", "Sneha Iyer", "sneha.iyer@gmail.com", "+91 90040 33221"],
    ["cust_Lw6Bv3Rs9tYd4p", "Vikram Singh", "vikram.s@protonmail.com", "+91 99870 66554"],
  ];
  for (const c of custs) {
    await _run("INSERT INTO customers (id, merchant_id, name, email, contact, created_at) VALUES (?,?,?,?,?,?)", [
      c[0], mid, c[1], c[2], c[3], t - 90 * 86400000,
    ]);
  }

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
  const descs = ["Premium Subscription", "Order #4821", "Grocery delivery", "Electronics order", "Fitness plan", "Course enrollment", "Food order", "Cab ride", "Cloud storage", "Design services"];

  for (let i = 0; i < statuses.length; i++) {
    const [st, method, last4, network] = statuses[i];
    const amt = amounts[i % amounts.length];
    const created = t - i * 86400000 - (i % 5) * 3600000;
    const oid = "order_" + randomBytes(10).toString("hex");
    const pid = "pay_" + randomBytes(10).toString("hex");
    const cust = custs[i % custs.length];
    const desc = descs[i % descs.length];
    const captured = st === "captured" || st === "refunded" ? 1 : 0;
    const fee = captured ? Math.round(amt * 0.02) : 0;
    const tax = Math.round(fee * 0.18);
    const orderStatus = st === "refunded" ? "paid" : st === "captured" ? "paid" : st === "failed" ? "attempted" : "created";

    await _run(
      "INSERT INTO orders (id, merchant_id, amount, currency, receipt, notes, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
      [oid, mid, amt, "INR", `rcpt_${1000 + i}`, JSON.stringify({ customer: cust[1] }), orderStatus, created, created + 60000]
    );
    await _run(
      `INSERT INTO payments (id, merchant_id, order_id, amount, currency, status, method, card_last4, card_network, upi_id, bank, wallet, email, contact, description, fee, tax, captured, razorpay_signature, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [pid, mid, oid, amt, "INR", st, method, last4, network,
       method === "upi" ? `customer${i}@okhdfcbank` : null,
       method === "netbanking" ? "HDFC Bank" : null,
       method === "wallet" ? "PhonePe" : null,
       cust[2], cust[3], desc, fee, tax, captured,
       st === "captured" || st === "refunded" ? `sign_${randomBytes(8).toString("hex")}` : null,
       created, created + 60000]
    );

    if (st === "refunded") {
      const rid = "refund_" + randomBytes(10).toString("hex");
      const rAmt = Math.round(amt * (i % 3 === 0 ? 1 : 0.5));
      await _run(
        "INSERT INTO refunds (id, merchant_id, payment_id, amount, currency, status, speed, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [rid, mid, pid, rAmt, "INR", "processed", "normal", "{}", created + 3600000, created + 7200000]
      );
    }
  }
}

export async function exec(sql: string): Promise<void> {
  await initStore();
  if (usePg) {
    for (const stmt of splitStatements(sql)) {
      if (stmt.trim()) await pool!.query(stmt);
    }
  } else {
    (await getSqlite()).exec(sql);
  }
}

export async function run(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
  await initStore();
  if (usePg) {
    const res = await pool!.query(toPgSql(sql), params);
    return { changes: res.rowCount ?? 0 };
  }
  const stmt = (await getSqlite()).prepare(sql);
  stmt.run(...params);
  return { changes: 1 };
}

export async function get(sql: string, params: unknown[] = []): Promise<Row | undefined> {
  await initStore();
  if (usePg) {
    const res = await pool!.query(toPgSql(sql), params);
    return res.rows[0] as Row | undefined;
  }
  const stmt = (await getSqlite()).prepare(sql);
  return stmt.get(...params) as Row | undefined;
}

export async function all(sql: string, params: unknown[] = []): Promise<Row[]> {
  await initStore();
  if (usePg) {
    const res = await pool!.query(toPgSql(sql), params);
    return res.rows as Row[];
  }
  const stmt = (await getSqlite()).prepare(sql);
  return stmt.all(...params) as Row[];
}

function splitStatements(sql: string): string[] {
  // simple splitter for DDL (no semicolons inside string literals in our schema)
  return sql.split(";").filter((s) => s.trim().length > 0);
}

// ---- Schema (portable DDL; PRAGMAs guarded per backend) ----
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  mode TEXT NOT NULL DEFAULT 'test',
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS api_keys (
  key_id TEXT PRIMARY KEY,
  key_secret TEXT NOT NULL,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  name TEXT NOT NULL DEFAULT 'Default',
  active INTEGER NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  receipt TEXT,
  notes TEXT DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'created',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
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
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
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
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  event TEXT NOT NULL,
  entity TEXT NOT NULL,
  payload TEXT NOT NULL,
  signature TEXT NOT NULL,
  delivered INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  name TEXT,
  email TEXT,
  contact TEXT,
  created_at BIGINT NOT NULL
);
`;
