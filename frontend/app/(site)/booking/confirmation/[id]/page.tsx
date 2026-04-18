import Link from "next/link";
import AddToCalendarButton from "@/components/AddToCalendarButton";
import InvoiceDownloadCard from "@/components/InvoiceDownloadCard";
import { API_BASE } from "@/lib/api";
import { Booking } from "@/lib/types";

export default async function BookingConfirmation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await fetch(`${API_BASE}/booking/${id}`, { cache: "no-store" });
  if (!res.ok) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-4 py-16">
        <div className="card space-y-4 p-8 text-center">
          <h1 className="text-2xl font-bold">Booking not found</h1>
          <p className="text-gray-600 dark:text-zinc-400">Check the link or start a new booking.</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/booking" className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black">
              New booking
            </Link>
            <Link href="/" className="rounded-full border border-black/15 px-5 py-2.5 text-sm dark:border-white/20">
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }
  const booking: Booking = await res.json();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <div className="card space-y-5 p-8 shadow-lg">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Confirmed</p>
          <h1 className="mt-1 text-3xl font-bold">You&apos;re booked</h1>
          <p className="mt-2 text-gray-600 dark:text-zinc-400">
            We sent a confirmation email if SMTP is configured on the server.
          </p>
        </div>
        <dl className="space-y-3 border-t border-black/5 pt-6 text-sm dark:border-white/10">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-zinc-500">Booking ID</dt>
            <dd className="font-mono text-right text-xs">{booking._id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-zinc-500">Service</dt>
            <dd className="font-medium">{booking.serviceId?.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-zinc-500">Vehicle</dt>
            <dd>{booking.vehicleType}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-zinc-500">Slot</dt>
            <dd>
              {booking.date} at {booking.time}
            </dd>
          </div>
        </dl>
        <InvoiceDownloadCard bookingId={booking._id} />
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <AddToCalendarButton
            bookingId={booking._id}
            serviceName={booking.serviceId?.name ?? "Service"}
            vehicleType={booking.vehicleType}
            carModel={booking.carModel}
            date={booking.date}
            time={booking.time}
            durationMinutes={booking.serviceId?.duration ?? 60}
          />
          <Link href="/services" className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black">
            Browse services
          </Link>
          <Link href="/" className="rounded-full border border-black/15 px-5 py-2.5 text-sm dark:border-white/20">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
