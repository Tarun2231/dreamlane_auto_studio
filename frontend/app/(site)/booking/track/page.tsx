"use client";

import { useState } from "react";
import Link from "next/link";
import BookingIdCallout from "@/components/BookingIdCallout";
import InvoiceDownloadCard from "@/components/InvoiceDownloadCard";
import { api } from "@/lib/api";
import type { Booking } from "@/lib/types";

export default function TrackBookingPage() {
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBooking(null);
    setLoading(true);
    try {
      const res = await api.post<Booking>("/booking/lookup", { id: id.trim(), email: email.trim() });
      setBooking(res.data);
    } catch {
      setErr("No booking matches that ID and email. Check your confirmation email or spelling.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-500">Booking</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Track your booking</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
        Enter the booking ID from your confirmation page and the email you used when booking.
      </p>
      <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs leading-relaxed text-zinc-700 dark:border-amber-500/20 dark:bg-amber-500/[0.08] dark:text-zinc-300">
        <strong className="text-zinc-900 dark:text-zinc-100">Where is my ID?</strong> After you book, the confirmation screen shows it in a gold box with a{" "}
        <strong>Copy ID</strong> button. It&apos;s also the long code at the end of your confirmation link:{" "}
        <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">/booking/confirmation/</span>
        <span className="font-mono text-[11px] font-semibold">…your-id</span>
      </p>

      <form onSubmit={submit} className="card mt-8 space-y-4 p-4 sm:p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Booking ID</label>
          <input
            className="w-full rounded-xl border border-gray-300 bg-white p-3 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-800"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. 507f1f77bcf86cd799439011"
            required
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        {err && <p className="text-sm text-red-700 dark:text-red-300">{err}</p>}
        <button type="submit" className="btn-primary w-full min-h-[44px] disabled:opacity-50" disabled={loading}>
          {loading ? "Looking up…" : "View booking"}
        </button>
      </form>

      {booking && (
        <div className="card mt-6 space-y-4 p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Found</p>
          <BookingIdCallout bookingId={booking._id} compact />
          <dl className="space-y-3 text-sm">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="shrink-0 text-gray-500 dark:text-zinc-500">Status</dt>
              <dd className="min-w-0 font-medium sm:text-right">{booking.status}</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="shrink-0 text-gray-500 dark:text-zinc-500">Service</dt>
              <dd className="min-w-0 break-words font-medium sm:max-w-[70%] sm:text-right">{booking.serviceId?.name}</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="shrink-0 text-gray-500 dark:text-zinc-500">Slot</dt>
              <dd className="min-w-0 sm:text-right">
                {booking.date} at {booking.time}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="shrink-0 text-gray-500 dark:text-zinc-500">Vehicle</dt>
              <dd className="min-w-0 break-words sm:text-right">
                {[booking.carMake, booking.carModel].filter(Boolean).join(" ") || booking.carModel}
                {booking.vehicleYear != null ? ` · ${booking.vehicleYear}` : ""}
                <span className="block text-xs font-normal text-gray-500 dark:text-zinc-500">
                  {booking.vehicleType}
                  {booking.chassisNumber || booking.registrationNumber
                    ? ` · Chassis: ${booking.chassisNumber || booking.registrationNumber}`
                    : ""}
                </span>
              </dd>
            </div>
          </dl>
          <InvoiceDownloadCard bookingId={booking._id} email={email.trim()} />
          <Link href={`/booking/confirmation/${booking._id}`} className="inline-block text-sm font-semibold text-amber-800 underline dark:text-amber-400">
            Open full confirmation page →
          </Link>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-gray-600 dark:text-zinc-500">
        <Link href="/booking" className="font-medium text-amber-800 underline dark:text-amber-400">
          New booking
        </Link>
        {" · "}
        <Link href="/" className="font-medium text-gray-700 underline dark:text-zinc-400">
          Home
        </Link>
      </p>
    </main>
  );
}
