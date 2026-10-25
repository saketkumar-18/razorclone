"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Incorrect password");
        setLoading(false);
      }
    } catch {
      setError("Login failed — try again");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4">
      <div>
        <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--rzp-slate)" }}>
          Dashboard password
        </label>
        <input
          type="password"
          className="rzp-input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
      </div>
      {error && (
        <div className="text-sm font-medium rounded-lg px-4 py-3" style={{ background: "#fef3f2", color: "#b42318" }}>
          {error}
        </div>
      )}
      <button type="submit" disabled={loading} className="rzp-btn-primary w-full py-2.5 text-sm">
        {loading ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
