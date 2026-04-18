"use client";

import { useState } from "react";
import { downloadBookingInvoice } from "@/lib/downloadInvoice";

type Props = {
  bookingId: string;
  /** When omitted, user must type email (e.g. confirmation page). */
  email?: string;
};

export default function InvoiceDownloadCard({ bookingId, email: emailProp }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const effectiveEmail = emailProp?.trim() || email.trim();

  const onDownload = async () => {
    setErr(null);
    if (!effectiveEmail) {
      setErr("Enter the email you used when booking.");
      return;
    }
    setLoading(true);
    try {
      await downloadBookingInvoice(bookingId, effectiveEmail);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not download invoice.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-zinc-900/50">
      <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Invoice (PDF)</p>
      <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">
        For security, we verify your booking email. Use the same email as when you booked.
      </p>
      {!emailProp ? (
        <input
          type="email"
          className="mt-3 w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      ) : null}
      {err && <p className="mt-2 text-sm text-red-700 dark:text-red-300">{err}</p>}
      <button
        type="button"
        className="btn-primary mt-3 w-full min-h-[44px] text-sm disabled:opacity-50"
        disabled={loading}
        onClick={onDownload}
      >
        {loading ? "Preparing PDF…" : "Download invoice"}
      </button>
    </div>
  );
}
