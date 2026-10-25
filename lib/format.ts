// Shared formatting helpers (smallest-currency-unit convention)
export const inr = (paise: number) =>
  "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const fmtDateShort = (ts: number) =>
  new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const truncate = (s: string, n = 22) => (s.length > n ? s.slice(0, n) + "…" : s);
