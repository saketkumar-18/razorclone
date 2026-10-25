import { getApiKey } from "@/lib/gateway";
import { ApiKeyCard } from "./api-key-card";

export const revalidate = 0;

export default function ApiKeysPage() {
  const key = getApiKey();

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold" style={{ color: "var(--rzp-navy)" }}>API Keys</h1>
      <p className="text-sm mt-1 mb-6" style={{ color: "var(--rzp-slate)" }}>
        Authenticate API requests with your key ID and key secret. Keys are shown once —
        treat them like passwords.
      </p>

      <ApiKeyCard
        keyId={key?.key_id ?? ""}
        keySecret={key?.key_secret ?? ""}
      />

      <div className="rzp-card p-6 mt-6">
        <div className="text-sm font-semibold mb-3">Using the keys</div>
        <pre className="text-xs mono leading-relaxed p-4 rounded-xl overflow-x-auto" style={{ background: "#0b1520", color: "#c9d8e8" }}>
{`# Basic auth is how the real Razorpay API authenticates:
curl https://api.razorpay.com/v1/orders \\
  -u ${key?.key_id ?? "rzp_test_XXXX"}:${key?.key_secret?.slice(0, 8) ?? "secret"} \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 49900, "currency": "INR"}'`}
        </pre>
        <p className="text-xs mt-3" style={{ color: "var(--rzp-slate)" }}>
          This simulator skips auth so you can explore; the pattern is the same as the real product.
        </p>
      </div>
    </div>
  );
}
