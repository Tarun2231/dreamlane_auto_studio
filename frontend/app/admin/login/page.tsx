"use client";

import axios from "axios";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { api } from "@/lib/api";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@carcare.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e?: FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ token: string }>("/auth/admin/login", { email, password });
      const token = res.data?.token;
      if (!token) {
        setError("No token returned. Check backend logs.");
        return;
      }
      localStorage.setItem("adminToken", token);
      // Full navigation so admin layout reads token reliably (avoids SPA state issues)
      window.location.assign("/admin");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.code === "ERR_NETWORK" || err.message === "Network Error" || !err.response) {
          setError(
            "Network error — check that the dev server is running (npm run dev from the project folder)."
          );
        } else {
          const data = err.response?.data as { message?: string } | undefined;
          const msg = data?.message;
          setError(
            typeof msg === "string" && msg.length > 0
              ? msg
              : `Error ${err.response?.status ?? ""}`.trim()
          );
        }
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
      <div className="relative w-full max-w-md">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-amber-500/90">Staff only</p>
        <h1 className="mt-3 text-center text-2xl font-bold text-white">Admin sign in</h1>
        <p className="mt-2 text-center text-sm text-slate-400">Manage services, slots, bookings, and customers.</p>
        <ul className="mx-auto mt-4 max-w-sm list-inside list-disc text-left text-xs text-slate-500">
          <li>Secure staff access to your operations panel</li>
          <li>After sign-in, open Help in the sidebar for a quick tour</li>
        </ul>

        <form onSubmit={login} className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
          <label className="block text-xs font-medium text-slate-300">Email</label>
          <input
            className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-base text-white placeholder:text-slate-500 outline-none ring-amber-500/30 focus:ring-2 sm:text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            name="email"
          />
          <label className="mt-4 block text-xs font-medium text-slate-300">Password</label>
          <input
            className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-base text-white outline-none ring-amber-500/30 focus:ring-2 sm:text-sm"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            name="password"
          />
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          <Link href="/" className="font-medium text-amber-400/90 hover:text-amber-300">
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
