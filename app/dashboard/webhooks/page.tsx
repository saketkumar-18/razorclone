import { listWebhookEvents, getApiKey } from "@/lib/gateway";
import { fmtDate } from "@/lib/format";

export const revalidate = 0;

export default async function WebhooksPage() {
  const events = listWebhookEvents(100) as any[];
  const key = getApiKey();

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold" style={{ color: "var(--rzp-navy)" }}>Webhooks</h1>
      <p className="text-sm mt-1 mb-6" style={{ color: "var(--rzp-slate)" }}>
        Every lifecycle event fires a signed webhook. Verify the signature server-side
        before trusting the payload — the same way a merchant would.
      </p>

      <div className="rzp-card p-5 mb-6">
        <div className="text-sm font-semibold mb-3">How to verify an event</div>
        <pre className="text-xs mono leading-relaxed p-4 rounded-xl overflow-x-auto" style={{ background: "#0b1520", color: "#c9d8e8" }}>
{`// payload = the raw webhook body, signature = the X-Razorpay-Signature header
expected = HMAC_SHA256(payload, "${key?.key_secret.slice(0, 12) ?? "key_secret"}…")
valid   = timingSafeEqual(expected, signature)`}
        </pre>
        <p className="text-xs mt-3" style={{ color: "var(--rzp-slate)" }}>
          Try it live:{" "}
          <span className="mono">POST /api/v1/webhooks/verify</span> with{" "}
          <span className="mono">{"{payload, signature}"}</span> from any event below.
        </p>
      </div>

      <div className="rzp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="rzp-table w-full">
            <thead>
              <tr>
                <th>Event</th>
                <th>Entity</th>
                <th>Signature</th>
                <th>Delivered</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                let payload: any = null;
                try {
                  payload = JSON.parse(String(e.payload));
                } catch {}
                return (
                  <tr key={e.id} className="hover:bg-[#fafbfd] align-top">
                    <td>
                      <span className="mono text-xs font-semibold" style={{ color: "var(--rzp-blue)" }}>{e.event}</span>
                      {payload?.entity?.status ? (
                        <span className="block mt-1"><StatusDot status={payload.entity.status} /></span>
                      ) : null}
                    </td>
                    <td className="mono text-xs">{e.entity}</td>
                    <td>
                      <span className="mono text-[11px]" style={{ color: "var(--rzp-slate)" }}>{String(e.signature).slice(0, 24)}…</span>
                      <details className="mt-1">
                        <summary className="text-[11px] font-semibold cursor-pointer" style={{ color: "var(--rzp-blue)" }}>view payload</summary>
                        <pre className="text-[10px] mono mt-1 p-2 rounded-lg overflow-x-auto" style={{ background: "#fafbfd", border: "1px solid var(--rzp-border)" }}>
                          {JSON.stringify(payload, null, 1).slice(0, 600)}
                        </pre>
                      </details>
                    </td>
                    <td>
                      <span className="badge badge-captured">{Number(e.delivered) ? "delivered" : "pending"}</span>
                    </td>
                    <td className="text-xs whitespace-nowrap" style={{ color: "var(--rzp-slate)" }}>{fmtDate(Number(e.created_at))}</td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-sm" style={{ color: "var(--rzp-slate)" }}>
                    No webhook events yet — complete a checkout to generate one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    captured: "#16a34a",
    authorized: "#175cd3",
    failed: "#b42318",
    processed: "#16a34a",
  };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: colors[status] ?? "#175cd3" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors[status] ?? "#175cd3" }} />
      {status}
    </span>
  );
}
