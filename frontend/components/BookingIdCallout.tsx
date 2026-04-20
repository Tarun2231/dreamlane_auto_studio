"use client";

import { useState } from "react";

type Props = {
  bookingId: string;
  /** Shorter label for compact layouts */
  compact?: boolean;
};

/**
 * High-contrast booking reference with copy — Mongo ObjectId is long and easy to miss in plain body text.
 */
export default function BookingIdCallout({ bookingId, compact }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bookingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  };

  const shortRef = bookingId.length >= 8 ? bookingId.slice(-8) : bookingId;

  return (
    <div
      className={`rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] dark:border-amber-500/25 dark:bg-amber-500/[0.1] ${
        compact ? "p-3" : "p-4 sm:p-5"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400">Booking ID</p>
          <p className="mt-1.5 break-all font-mono text-base font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">
            {bookingId}
          </p>
          {!compact ? (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Short ref (last 8 characters): <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{shortRef}</span> — use the full ID
              above when pasting into Track or reviews.
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Ends with <span className="font-mono">{shortRef}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 rounded-full border border-amber-600/40 bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-50 dark:border-amber-500/40 dark:bg-zinc-900 dark:text-amber-100 dark:hover:bg-zinc-800"
        >
          {copied ? "Copied" : "Copy ID"}
        </button>
      </div>
    </div>
  );
}
