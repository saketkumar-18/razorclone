import { notFound } from "next/navigation";
import { getOrder, getMerchant } from "@/lib/gateway";
import { Checkout } from "./checkout";

export const revalidate = 0;

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, merchant] = await Promise.all([getOrder(id), getMerchant()]);
  if (!order) notFound();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#eef2f7" }}>
      <div className="w-full max-w-2xl">
        {/* header */}
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold text-white" style={{ background: "var(--rzp-blue)" }}>
              R
            </div>
            <span className="font-semibold text-sm" style={{ color: "var(--rzp-navy)" }}>
              {merchant?.name ?? "Checkout"}
            </span>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white border" style={{ color: "var(--rzp-slate)", borderColor: "var(--rzp-border)" }}>
            🔒 Secured by RazorClone
          </span>
        </div>

        <Checkout order={order as any} />
      </div>

      <p className="mt-6 text-xs text-center max-w-md" style={{ color: "var(--rzp-slate)" }}>
        This is a simulated payment gateway for learning. Test cards never move real
        money. Use the documented Razorpay test cards to try different outcomes.
      </p>
    </div>
  );
}
