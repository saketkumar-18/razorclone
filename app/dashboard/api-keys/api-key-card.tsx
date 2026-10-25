"use client";

import { useState } from "react";

export function ApiKeyCard({ keyId, keySecret }: { keyId: string; keySecret: string }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState("");

  function copy(v: string, label: string) {
    navigator.clipboard?.writeText(v).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    });
  }

  return (
    <div className="rzp-card overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--rzp-border)", background: "#fafbfd" }}>
        <div className="text-sm font-semibold">Test keys</div>
        <span className="badge badge-authorized">test mode</span>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <div className="text-xs font-semibold mb-1.5" style={{ color: "var(--rzp-slate)" }}>Key ID</div>
          <div className="flex items-center gap-2">
            <code className="rzp-input mono text-xs flex-1">{keyId}</code>
            <button onClick={() => copy(keyId, "id")} className="px-3 py-2 text-xs font-semibold rounded-lg border" style={{ borderColor: "var(--rzp-border)" }}>
              {copied === "id" ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold mb-1.5" style={{ color: "var(--rzp-slate)" }}>Key Secret</div>
          <div className="flex items-center gap-2">
            <code className="rzp-input mono text-xs flex-1">{show ? keySecret : "••••••••••••••••••••••••••••"}</code>
            <button onClick={() => setShow(!show)} className="px-3 py-2 text-xs font-semibold rounded-lg border" style={{ borderColor: "var(--rzp-border)" }}>
              {show ? "Hide" : "Show"}
            </button>
            <button onClick={() => copy(keySecret, "secret")} className="px-3 py-2 text-xs font-semibold rounded-lg border" style={{ borderColor: "var(--rzp-border)" }}>
              {copied === "secret" ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--rzp-slate)" }}>
          The key secret signs payment and webhook payloads (HMAC-SHA256). Never expose it client-side.
        </p>
      </div>
    </div>
  );
}
