"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function AdminLocalDataBackupCard() {
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const exportAllJSON = async () => {
    setDownloading(true);
    setMsg(null);
    try {
      const [bookingsRes, quotesRes, servicesRes] = await Promise.allSettled([
        api.get("/admin/dashboard"),
        api.get("/admin/quote-stats"),
        api.get("/services"),
      ]);

      const backupData = {
        exportedAt: new Date().toISOString(),
        host: typeof window !== "undefined" ? window.location.host : "localhost:3000",
        version: "5.0.0-offline",
        dashboard: bookingsRes.status === "fulfilled" ? bookingsRes.value.data : null,
        quoteStats: quotesRes.status === "fulfilled" ? quotesRes.value.data : null,
        services: servicesRes.status === "fulfilled" ? servicesRes.value.data : null,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = `dreamlane_workshop_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMsg(`✓ Backup saved locally as ${filename}`);
    } catch {
      setMsg("Failed to generate backup. Check local connection.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Local System Offline Storage
          </span>
          <h2 className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Local Data & Offline Backup
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Export all bookings, quotes, customer entries, and services directly to your computer.
          </p>
        </div>
        <button
          type="button"
          onClick={exportAllJSON}
          disabled={downloading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50 shadow-md shadow-amber-500/10 active:scale-95"
        >
          {downloading ? "Exporting..." : "💾 Export Local Backup (JSON)"}
        </button>
      </div>

      {msg && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300">
          {msg}
        </div>
      )}
    </div>
  );
}
