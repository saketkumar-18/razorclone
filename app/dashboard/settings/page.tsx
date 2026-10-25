import { getMerchant } from "@/lib/gateway";

export const revalidate = 0;

export default async function SettingsPage() {
  const m = await getMerchant();

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold" style={{ color: "var(--rzp-navy)" }}>Settings</h1>
      <p className="text-sm mt-1 mb-6" style={{ color: "var(--rzp-slate)" }}>Merchant account and payment configuration.</p>

      <div className="rzp-card p-6 mb-5">
        <div className="text-sm font-semibold mb-4">Business profile</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>Business name</label>
            <input className="rzp-input" defaultValue={m?.name} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>Email</label>
            <input className="rzp-input" defaultValue={m?.email} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>Phone</label>
            <input className="rzp-input" defaultValue={m?.phone} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>Account ID</label>
            <input className="rzp-input mono text-xs" defaultValue={m?.id} readOnly />
          </div>
        </div>
        <button className="rzp-btn-primary px-4 py-2 text-sm mt-5">Save changes</button>
      </div>

      <div className="rzp-card p-6">
        <div className="text-sm font-semibold mb-4">Payment capture</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Automatic capture</div>
            <p className="text-xs mt-1" style={{ color: "var(--rzp-slate)" }}>
              As per the documented lifecycle, capture moves the payment from authorized to captured
              and the order to paid.
            </p>
          </div>
          <div className="relative">
            <div className="w-11 h-6 rounded-full" style={{ background: "var(--rzp-blue)" }}>
              <div className="w-4 h-4 rounded-full bg-white mt-1 ml-6" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-5 pt-5 border-t" style={{ borderColor: "var(--rzp-border)" }}>
          <div>
            <div className="text-sm font-medium">Mode</div>
            <p className="text-xs mt-1" style={{ color: "var(--rzp-slate)" }}>Simulator runs in test mode. No real money moves.</p>
          </div>
          <span className="badge badge-authorized">{m?.mode} mode</span>
        </div>
      </div>
    </div>
  );
}
