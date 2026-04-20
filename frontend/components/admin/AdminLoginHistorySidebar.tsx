"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { AdminLoginHistoryItem } from "@/lib/types";

/**
 * Compact recent admin sign-ins for the left sidebar (above “View live site”).
 */
export default function AdminLoginHistorySidebar() {
  const [items, setItems] = useState<AdminLoginHistoryItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminApi.get<{ items: AdminLoginHistoryItem[] }>("/login-history", {
          params: { limit: "2" },
        });
        if (!cancelled) setItems(res.data.items);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-6" aria-labelledby="sidebar-login-history-heading">
      <Link
        href="/admin/login-history"
        id="sidebar-login-history-heading"
        className="group block rounded-lg px-1 py-1 -mx-1 outline-none ring-amber-500/0 transition hover:bg-zinc-100/90 focus-visible:ring-2 dark:hover:bg-zinc-800/80"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200">
            Sign-in history
          </span>
          <span className="shrink-0 text-[10px] font-medium text-blue-700 group-hover:underline dark:text-blue-400">
            View all
          </span>
        </span>
        <span className="mt-1 block text-[10px] leading-snug text-zinc-400 group-hover:text-zinc-500 dark:text-zinc-500 dark:group-hover:text-zinc-400">
          Last 2 sign-ins only — use View all for the full list.
        </span>
      </Link>
      <div className="mt-3 space-y-2.5 pr-0.5">
        {items === null ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            No sign-ins recorded yet.
          </p>
        ) : (
          items.map((row) => {
            const when = new Date(row.at);
            const ok = !Number.isNaN(when.getTime());
            return (
              <div
                key={row.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50/90 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-800/50"
              >
                <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">
                  {ok ? (
                    <time dateTime={when.toISOString()}>
                      {when.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </time>
                  ) : (
                    "—"
                  )}
                </p>
                {row.timezoneLine ? (
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
                    {row.timezoneLine}
                  </p>
                ) : null}
                <p
                  className="mt-1 line-clamp-2 text-[11px] text-zinc-600 dark:text-zinc-300"
                  title={row.locationLabel}
                >
                  {row.locationLabel || "—"}
                </p>
                <p className="mt-1 truncate text-[10px] text-zinc-500 dark:text-zinc-500" title={`${row.email} · ${row.ip}`}>
                  <span className="font-medium text-zinc-600 dark:text-zinc-400">{row.email}</span>
                  {row.ip ? <span className="font-mono text-zinc-500"> · {row.ip}</span> : null}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
