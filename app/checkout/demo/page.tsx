import { redirect } from "next/navigation";
import { createOrder } from "@/lib/gateway";

export const revalidate = 0;

export default async function DemoCheckoutPage() {
  const order = await createOrder({
    amount: 49900,
    currency: "INR",
    receipt: "rcpt_demo_" + Date.now(),
    notes: { source: "demo" },
  });
  redirect(`/checkout/${order.id}`);
}
