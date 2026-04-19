"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { AdminLoginHistoryItem } from "@/lib/types";

export default function AdminLoginHistoryPage() {
  const [items, setItems] = useState<AdminLoginHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await adminApi.get<{ items: AdminLoginHistoryItem[] }>("/login-history", {
        params: { limit: "100" },
      });
      setItems(res.data.items);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      const msg = ax.response?.data?.message;
      setError(
        typeof msg === "string" && msg.trim()
          ? msg
          : "Could not load sign-in history. Check that the API is running and you are still logged in."
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-zinc-200/80 pb-4 dark:border-zinc-700/80 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Admin sign-in history</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Every successful admin login we record: time (your browser and the workshop timezone from the server), approximate
            location from IP, and device info. Newest first — up to 100 entries.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:self-center"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">User-Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {loading && items === null ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    Loading…
                  </td>
                </tr>
              ) : !loading && items && items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    No sign-ins recorded yet. Sign out and sign in again — a row is created on each successful login.
                  </td>
                </tr>
              ) : (
                (items ?? []).map((row) => {
                  const when = new Date(row.at);
                  const whenOk = !Number.isNaN(when.getTime());
                  return (
                    <tr key={row.id} className="bg-white/40 dark:bg-zinc-950/20">
                      <td className="align-top px-4 py-3 text-zinc-800 dark:text-zinc-200">
                        {whenOk ? (
                          <>
                            <time dateTime={when.toISOString()} className="block font-medium tabular-nums">
                              {when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                            </time>
                            {row.isoUtc ? (
                              <span className="mt-0.5 block font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                UTC {row.isoUtc}
                              </span>
                            ) : null}
                            {row.timezoneLine ? (
                              <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                                {row.timezoneLine}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="align-top px-4 py-3 text-zinc-800 dark:text-zinc-200">
                        <span className="font-medium">{row.email}</span>
                        {row.name ? (
                          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{row.name}</span>
                        ) : null}
                      </td>
                      <td
                        className="max-w-xs align-top px-4 py-3 text-zinc-700 dark:text-zinc-300"
                        title={row.locationLabel}
                      >
                        <span className="line-clamp-4 whitespace-pre-wrap break-words">{row.locationLabel || "—"}</span>
                      </td>
                      <td className="align-top px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {row.ip || "—"}
                      </td>
                      <td
                        className="max-w-[min(24rem,40vw)] align-top px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400"
                        title={row.userAgent}
                      >
                        <span className="line-clamp-4 break-all">{row.userAgent || "—"}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
