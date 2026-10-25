import Link from "next/link";
import { LoginForm } from "../login-form";

export default function DashboardLoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "var(--rzp-navy-deep)" }}>
      <div className="w-full max-w-sm text-center mb-8">
        <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: "var(--rzp-blue)" }}>
          R
        </div>
        <h1 className="text-xl font-bold text-white mt-4">RazorClone Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#9fb3c8" }}>Sign in to manage your payment gateway</p>
      </div>
      <div className="w-full max-w-sm rzp-card p-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-xs" style={{ color: "#768ea7" }}>
        <Link href="/" className="hover:underline">← Back to home</Link>
      </p>
    </div>
  );
}
