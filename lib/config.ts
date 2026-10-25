// Runtime configuration
// When RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET are set, the gateway proxies to the
// real Razorpay API (licensed PSP). Otherwise it runs in simulator mode.
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

export const PSP_MODE: "live" | "simulator" =
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET ? "live" : "simulator";

// Comma-separated list of origins allowed to call the API from browsers (CORS).
// Defaults to * so your apps can integrate immediately; set it to your app's
// origin(s) in production for tighter security.
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
