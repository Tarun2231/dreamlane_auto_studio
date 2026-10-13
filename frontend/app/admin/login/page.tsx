"use client";

import axios from "axios";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@carcare.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsLocalhost(
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.endsWith(".local")
      );
    }
  }, []);

  const fillCredentials = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setError("");
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

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
            "Network error — check that the backend server is running or database is reachable."
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
        <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-amber-500/90">Staff Portal</p>
        <h1 className="mt-3 text-center text-2xl font-bold text-white">Admin Sign In</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Sign in to manage services, slots, bookings, quotes, and team access.
        </p>

        {/* Status Badge */}
        <div className="mt-3 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {isLocalhost
              ? "Local Workshop Device (Localhost) — Active"
              : "Live Cloud Management Portal — Online"}
          </span>
        </div>

        {/* Demo Credentials Box */}
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Demo & Quick Access Credentials
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            {/* Account 1 */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
              <div className="min-w-0">
                <p className="font-semibold text-white">Default Admin</p>
                <p className="truncate text-slate-300">
                  <span className="text-slate-400">Email:</span> admin@carcare.com
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Password:</span> admin123
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => copyText("admin@carcare.com\nadmin123", "acc1")}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/10"
                  title="Copy email and password"
                >
                  {copiedKey === "acc1" ? "✓ Copied" : "📋 Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("admin@carcare.com", "admin123")}
                  className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-300 transition hover:bg-amber-500/30 active:scale-95"
                >
                  ⚡ Fill
                </button>
              </div>
            </div>

            {/* Account 2 */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
              <div className="min-w-0">
                <p className="font-semibold text-white">Owner / Live Admin</p>
                <p className="truncate text-slate-300">
                  <span className="text-slate-400">Email:</span> tarunn8n@gmail.com
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">Password:</span> admin123
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => copyText("tarunn8n@gmail.com\nadmin123", "acc2")}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/10"
                  title="Copy email and password"
                >
                  {copiedKey === "acc2" ? "✓ Copied" : "📋 Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("tarunn8n@gmail.com", "admin123")}
                  className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-300 transition hover:bg-amber-500/30 active:scale-95"
                >
                  ⚡ Fill
                </button>
              </div>
            </div>
          </div>

          <p className="mt-2.5 text-[11px] text-amber-300/70">
            💡 You can create custom usernames, change passwords, or remove credentials inside <strong>Admin → Settings → Team Access</strong>.
          </p>
        </div>

        {/* Sign In Form */}
        <form onSubmit={login} className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
          <label className="block text-xs font-medium text-slate-300">Email / Username</label>
          <input
            className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-base text-white placeholder:text-slate-500 outline-none ring-amber-500/30 focus:ring-2 sm:text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="admin@carcare.com"
            name="email"
          />
          
          <label className="mt-4 block text-xs font-medium text-slate-300">Password</label>
          <input
            className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-base text-white outline-none ring-amber-500/30 focus:ring-2 sm:text-sm"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            name="password"
          />

          {error && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-[0.99] disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In to Admin Panel"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="font-medium text-amber-400/90 hover:text-amber-300">
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
