"use client";

import { useState } from "react";
import Link from "next/link";
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

      <form onSubmit={submit} className="card mt-8 space-y-4 p-6">
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
        <div className="card mt-6 space-y-4 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Found</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-zinc-500">Status</dt>
              <dd className="font-medium">{booking.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-zinc-500">Service</dt>
              <dd className="font-medium">{booking.serviceId?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-zinc-500">Slot</dt>
              <dd>
                {booking.date} at {booking.time}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-zinc-500">Vehicle</dt>
              <dd>
                {booking.vehicleType} · {booking.carModel}
              </dd>
            </div>
          </dl>
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
