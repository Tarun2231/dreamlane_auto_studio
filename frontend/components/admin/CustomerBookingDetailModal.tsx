"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BookingIdCallout from "@/components/BookingIdCallout";
import { adminApi } from "@/lib/api";
import type { AdminBookingDetailResponse, JobCardRecord } from "@/lib/types";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function paymentLabel(s: string | undefined) {
  const x = (s || "unpaid").toLowerCase();
  if (x === "unpaid") return "Unpaid";
  if (x === "partial") return "Partial";
  if (x === "paid") return "Paid";
  if (x === "waived") return "Waived";
  return x;
}

async function downloadPdf(path: string, filename: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const r = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { message?: string };
    throw new Error(j.message || `Download failed (${r.status})`);
  }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  bookingId: string;
  onClose: () => void;
};

export default function CustomerBookingDetailModal({ bookingId, onClose }: Props) {
  const [data, setData] = useState<AdminBookingDetailResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfMsg, setPdfMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await adminApi.get<AdminBookingDetailResponse>(`/bookings/${bookingId}`);
      setData(res.data);
    } catch {
      setErr("Could not load booking details.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when modal opens
    void load();
  }, [load]);

  const b = data?.booking;

  const runPdf = async (kind: "job-sheet" | "invoice") => {
    setPdfMsg(null);
    try {
      const path =
        kind === "job-sheet"
          ? `/api/admin/bookings/${bookingId}/job-sheet.pdf`
          : `/api/admin/bookings/${bookingId}/invoice.pdf`;
      const fn = kind === "job-sheet" ? `job-sheet-${bookingId}.pdf` : `invoice-${bookingId}.pdf`;
      await downloadPdf(path, fn);
      setPdfMsg(kind === "job-sheet" ? "Job sheet downloaded." : "Invoice downloaded.");
    } catch (e: unknown) {
      setPdfMsg(e instanceof Error ? e.message : "Download failed.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-detail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
          <h2 id="booking-detail-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Booking details
          </h2>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : err || !b ? (
            <p className="text-sm text-red-600 dark:text-red-400">{err || "Not found."}</p>
          ) : (
            <>
              <BookingIdCallout bookingId={b._id} compact />
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/bookings?dateFrom=${encodeURIComponent(b.date)}&dateTo=${encodeURIComponent(b.date)}`}
                  className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  onClick={onClose}
                >
                  Open in Bookings
                </Link>
              </div>

              <DetailSection title="Status & slot">
                <p>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{b.status}</span>
                  <span className="text-zinc-500"> · </span>
                  <span className="tabular-nums text-zinc-800 dark:text-zinc-200">
                    {b.date} {b.time}
                  </span>
                </p>
              </DetailSection>

              <DetailSection title="Service">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{b.serviceId?.name ?? "—"}</p>
                {b.serviceId?.duration != null ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Estimated duration: {b.serviceId.duration} min</p>
                ) : null}
              </DetailSection>

              <DetailSection title="Customer">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{b.customerName}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{b.email}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{b.phone}</p>
              </DetailSection>

              <DetailSection title="Vehicle">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {[b.carMake, b.carModel].filter(Boolean).join(" ") || b.carModel}
                  {b.vehicleYear != null ? ` · ${b.vehicleYear}` : ""}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{b.vehicleType}</p>
                {b.chassisNumber || b.registrationNumber ? (
                  <p className="mt-1 font-mono text-sm text-zinc-700 dark:text-zinc-300">
                    Chassis (RC): {b.chassisNumber || b.registrationNumber}
                  </p>
                ) : null}
              </DetailSection>

              <DetailSection title="Payment">
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Billed amount</dt>
                    <dd className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {b.finalAmount != null ? formatInr(b.finalAmount) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Collection</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">{paymentLabel(b.paymentStatus)}</dd>
                  </div>
                  {b.paymentMethod ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-500 dark:text-zinc-400">Method</dt>
                      <dd className="text-right text-zinc-800 dark:text-zinc-200">{b.paymentMethod}</dd>
                    </div>
                  ) : null}
                  {b.paymentReference ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-500 dark:text-zinc-400">Reference</dt>
                      <dd className="break-all text-right font-mono text-xs text-zinc-800 dark:text-zinc-200">{b.paymentReference}</dd>
                    </div>
                  ) : null}
                  {b.paymentReceivedYmd ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-500 dark:text-zinc-400">Received on</dt>
                      <dd className="tabular-nums text-zinc-800 dark:text-zinc-200">{b.paymentReceivedYmd}</dd>
                    </div>
                  ) : null}
                </dl>
              </DetailSection>

              {data?.jobCard ? <JobCardSection jc={data.jobCard} /> : null}

              <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">PDFs</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    onClick={() => void runPdf("job-sheet")}
                  >
                    Download job sheet
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    onClick={() => void runPdf("invoice")}
                  >
                    Download invoice
                  </button>
                </div>
                {pdfMsg ? <p className="text-xs text-zinc-600 dark:text-zinc-400">{pdfMsg}</p> : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{title}</h3>
      <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}

function JobCardSection({ jc }: { jc: JobCardRecord }) {
  const hasLists =
    (jc.servicesDone && jc.servicesDone.length > 0) || (jc.partsUsed && jc.partsUsed.length > 0) || (jc.notes && jc.notes.trim());
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Workshop record</h3>
      <div className="mt-2 space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400">Parts cost</p>
            <p className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">{formatInr(jc.partsCostInr || 0)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400">Other costs</p>
            <p className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">{formatInr(jc.miscCostsInr || 0)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400">Extra charges</p>
            <p className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">{formatInr(jc.extraCharges || 0)}</p>
          </div>
        </div>
        {hasLists ? (
          <>
            {jc.servicesDone?.length ? (
              <div>
                <p className="text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400">Services done</p>
                <ul className="mt-1 list-inside list-disc text-zinc-800 dark:text-zinc-200">
                  {jc.servicesDone.map((line, i) => (
                    <li key={`${i}-${line}`}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {jc.partsUsed?.length ? (
              <div>
                <p className="text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400">Parts used</p>
                <ul className="mt-1 list-inside list-disc text-zinc-800 dark:text-zinc-200">
                  {jc.partsUsed.map((line, i) => (
                    <li key={`${i}-${line}`}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {jc.notes?.trim() ? (
              <div>
                <p className="text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{jc.notes}</p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400">No job card lines saved yet.</p>
        )}
      </div>
    </section>
  );
}
