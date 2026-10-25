import { randomBytes } from "node:crypto";
import { initStore, run, get, all } from "./store";

export { USE_PG } from "./store";

export const now = () => Date.now();
export const genId = (prefix: string) => `${prefix}_${randomBytes(10).toString("hex")}`;

export async function getMerchant() {
  await initStore();
  return (await get("SELECT * FROM merchants LIMIT 1")) as any;
}

export async function getApiKey() {
  await initStore();
  return (await get("SELECT * FROM api_keys WHERE active = 1 ORDER BY created_at LIMIT 1")) as any;
}

export { run, get, all };
