"use client";
/* eslint-disable @next/next/no-img-element */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminApi } from "@/lib/api";
import { Booking } from "@/lib/types";

type Inspection = {
  beforeImages: { url: string }[];
  afterImages: { url: string }[];
};

function telHref(phone?: string | null) {
  if (!phone) return "#";
  return `tel:${String(phone).replace(/\s/g, "")}`;
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );
}

/** Parse INR fields: empty or invalid → 0 (what we persist). */
function inrInputToNumber(raw: string): number {
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Show blank when there is nothing to bill yet; avoid displaying a lone 0. */
function storedAmountToInput(n: unknown): string {
  if (typeof n !== "number" || !Number.isFinite(n) || n === 0) return "";
  return String(n);
}

const PAYMENT_STATUSES = ["unpaid", "partial", "paid", "waived"] as const;

const PAYMENT_STATUS_LABELS: Record<(typeof PAYMENT_STATUSES)[number], string> = {
  unpaid: "Due (not settled)",
  partial: "Partially paid",
  paid: "Paid in full",
  waived: "Waived / no charge",
};

function paymentStatusLabel(ps: string | undefined) {
  const s = ps || "unpaid";
  const map: Record<string, string> = {
    unpaid: "Payment due",
    partial: "Partially paid",
    paid: "Paid in full",
    waived: "Payment waived",
  };
  return map[s] ?? "Payment due";
}

function paymentStatusPillClass(ps: string | undefined) {
  const s = ps || "unpaid";
  if (s === "paid") return "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-200";
  if (s === "partial") return "bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-200";
  if (s === "waived") return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200";
  return "bg-amber-100 text-amber-950 dark:bg-amber-950/45 dark:text-amber-200";
}

function BookingCustomerSummary({ booking }: { booking: Booking }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="min-w-0">
          <span className="text-zinc-500 dark:text-zinc-500">Email </span>
          <a
            href={`mailto:${booking.email}`}
            className="font-medium text-amber-800 underline decoration-amber-800/30 underline-offset-2 hover:decoration-amber-800 dark:text-amber-400 dark:decoration-amber-400/30"
          >
            {booking.email}
          </a>
        </span>
        <span>
          <span className="text-zinc-500 dark:text-zinc-500">Phone </span>
          <a
            href={telHref(booking.phone)}
            className="font-medium text-amber-800 underline decoration-amber-800/30 underline-offset-2 hover:decoration-amber-800 dark:text-amber-400 dark:decoration-amber-400/30"
          >
            {booking.phone}
          </a>
        </span>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        <span className="text-zinc-500 dark:text-zinc-500">Vehicle </span>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {[booking.carMake, booking.carModel].filter(Boolean).join(" ").trim() || booking.carModel}
          {booking.vehicleYear != null ? ` · ${booking.vehicleYear}` : ""}
        </span>
        <span className="mt-0.5 block text-xs font-normal text-zinc-500 dark:text-zinc-400">
          {booking.vehicleType}
          {booking.chassisNumber || booking.registrationNumber
            ? ` · ${booking.chassisNumber || booking.registrationNumber}`
            : ""}
        </span>
      </p>
    </div>
  );
}

function AdminBookingsPageContent() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [servicesDone, setServicesDone] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [extraCharges, setExtraCharges] = useState("");
  const [partsCostInr, setPartsCostInr] = useState("");
  const [miscCostsInr, setMiscCostsInr] = useState("");
  const [notes, setNotes] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [paymentStatusInput, setPaymentStatusInput] = useState<Booking["paymentStatus"]>("unpaid");
  const [jobCardSaving, setJobCardSaving] = useState(false);
  const [jobCardMsg, setJobCardMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [finalAmountInput, setFinalAmountInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentReceivedYmd, setPaymentReceivedYmd] = useState("");
  const [plSaving, setPlSaving] = useState(false);
  const [sheetMsg, setSheetMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [uploadBusy, setUploadBusy] = useState<"before" | "after" | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const openPanelRef = useRef<HTMLDivElement | null>(null);

  const closeDetails = useCallback(() => {
    setSelected(null);
    setInspection(null);
    setUploadErr(null);
    setSheetMsg(null);
    setJobCardMsg(null);
  }, []);

  useEffect(() => {
    if (!selected?._id) return;
    const id = requestAnimationFrame(() => {
      openPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(id);
  }, [selected?._id]);

  useEffect(() => {
    const single = searchParams?.get("date");
    const df = searchParams?.get("dateFrom");
    const dt = searchParams?.get("dateTo");
    const st = searchParams?.get("status");
    if (df && /^\d{4}-\d{2}-\d{2}$/.test(df)) {
      setDateFrom(df);
      if (dt && /^\d{4}-\d{2}-\d{2}$/.test(dt)) setDateTo(dt);
      else setDateTo(df);
    } else if (single && /^\d{4}-\d{2}-\d{2}$/.test(single)) {
      setDateFrom(single);
      setDateTo(single);
    } else if (!df && !single) {
      setDateFrom("");
      setDateTo("");
    }
    if (st && ["Pending", "In Progress", "Completed"].includes(st)) {
      setStatusFilter(st);
    } else if (!st) {
      setStatusFilter("");
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: { date?: string; dateFrom?: string; dateTo?: string; status?: string; paymentStatus?: string } = {};
      if (statusFilter) params.status = statusFilter;
      if (paymentFilter) params.paymentStatus = paymentFilter;
      if (dateFrom && dateTo) {
        params.dateFrom = dateFrom;
        params.dateTo = dateTo;
      } else if (dateFrom) {
        params.dateFrom = dateFrom;
      }
      const res = await adminApi.get("/bookings", { params });
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setLoadError(err?.response?.data?.message || "Failed to load bookings from server.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter, paymentFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setStatusMsg(null);
    try {
      await adminApi.put(`/booking/status/${id}`, { status });
      await load();
      if (selected?._id === id) {
        setSelected((s) => (s ? { ...s, status: status as Booking["status"] } : null));
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setStatusMsg(err?.response?.data?.message || "Could not update status.");
    }
  };

  const upload = async (type: "before" | "after", files: FileList | null) => {
    if (!selected || !files?.length) return;
    setUploadErr(null);
    setUploadBusy(type);
    const formData = new FormData();
    formData.append("type", type);
    Array.from(files).forEach((file) => formData.append("images", file));
    try {
      await adminApi.post(`/upload-images/${selected._id}`, formData);
      await openDetails(selected);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setUploadErr(err?.response?.data?.message || "Upload failed. Check file size/format and Cloudinary config.");
    } finally {
      setUploadBusy(null);
      if (type === "before" && beforeInputRef.current) beforeInputRef.current.value = "";
      if (type === "after" && afterInputRef.current) afterInputRef.current.value = "";
    }
  };

  const saveJobCard = async () => {
    if (!selected) return;
    setJobCardSaving(true);
    setJobCardMsg(null);
    try {
      await adminApi.post(`/job-card/${selected._id}`, {
        servicesDone: servicesDone.split(",").map((v) => v.trim()).filter(Boolean),
        partsUsed: partsUsed.split(",").map((v) => v.trim()).filter(Boolean),
        extraCharges: inrInputToNumber(extraCharges),
        partsCostInr: inrInputToNumber(partsCostInr),
        miscCostsInr: inrInputToNumber(miscCostsInr),
        notes: notes.trim(),
      });
      setJobCardMsg({ type: "ok", text: "Job card saved." });
      await openDetails(selected);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setJobCardMsg({
        type: "err",
        text: err?.response?.data?.message || "Could not save job card. Check the network or server logs.",
      });
    } finally {
      setJobCardSaving(false);
    }
  };

  const openDetails = async (booking: Booking) => {
    setJobCardMsg(null);
    setSelected(booking);
    try {
      const [jobCardRes, inspectionRes] = await Promise.allSettled([
        adminApi.get(`/job-card/${booking._id}`),
        adminApi.get(`/inspection/${booking._id}`),
      ]);
      const jobCard = jobCardRes.status === "fulfilled" ? jobCardRes.value.data : null;
      const insp = inspectionRes.status === "fulfilled" ? inspectionRes.value.data : null;
      setInspection(insp);
      setServicesDone((jobCard?.servicesDone || []).join(", "));
      setPartsUsed((jobCard?.partsUsed || []).join(", "));
      setExtraCharges(storedAmountToInput(jobCard?.extraCharges));
      setPartsCostInr(storedAmountToInput(jobCard?.partsCostInr));
      setMiscCostsInr(storedAmountToInput(jobCard?.miscCostsInr));
      setNotes(jobCard?.notes || "");
    } catch {
      // Sub-resource loading fallback
    }
    setFinalAmountInput(
      booking.finalAmount != null && booking.finalAmount > 0 ? String(booking.finalAmount) : ""
    );
    setPaymentMethod(typeof booking.paymentMethod === "string" ? booking.paymentMethod : "");
    setPaymentReference(typeof booking.paymentReference === "string" ? booking.paymentReference : "");
    setPaymentReceivedYmd(typeof booking.paymentReceivedYmd === "string" ? booking.paymentReceivedYmd : "");
    {
      const ps = booking.paymentStatus;
      setPaymentStatusInput(
        ps === "partial" || ps === "paid" || ps === "waived" || ps === "unpaid" ? ps : "unpaid"
      );
    }
    setSheetMsg(null);
  };

  const toggleDetails = (booking: Booking) => {
    if (selected?._id === booking._id) {
      closeDetails();
      return;
    }
    void openDetails(booking);
  };

  /** Saves customer payment (final amount) + spare parts / other costs for dashboard P&L in one request. */
  const savePaymentAndPL = async () => {
    if (!selected) return;
    setPlSaving(true);
    setSheetMsg(null);
    setJobCardMsg(null);
    try {
      const fa = Number(finalAmountInput);
      const res = await adminApi.put<Booking>(`/booking/${selected._id}/payment-pl`, {
        finalAmount: Number.isFinite(fa) ? Math.max(0, fa) : 0,
        partsCostInr: inrInputToNumber(partsCostInr),
        miscCostsInr: inrInputToNumber(miscCostsInr),
        paymentMethod: paymentMethod.trim(),
        paymentReference: paymentReference.trim(),
        paymentReceivedYmd: paymentReceivedYmd.trim(),
        paymentStatus: paymentStatusInput,
      });
      setSheetMsg({
        type: "ok",
        text: "Payment and costs saved. They appear on the admin dashboard P&L when this job is Completed and the service date is in range.",
      });
      await load();
      setSelected((s) => (s && s._id === selected._id ? res.data : s));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setSheetMsg({ type: "err", text: err?.response?.data?.message || "Could not save payment and costs." });
    } finally {
      setPlSaving(false);
    }
  };

  const downloadJobSheetPdf = async () => {
    if (!selected) return;
    setSheetMsg(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
      const r = await fetch(`/api/admin/bookings/${selected._id}/job-sheet.pdf`, {
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
      a.download = `job-sheet-${selected._id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSheetMsg({ type: "ok", text: "PDF downloaded." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not download PDF.";
      setSheetMsg({ type: "err", text: msg });
    }
  };

  const emailJobSheetPdf = async () => {
    if (!selected) return;
    setSheetMsg(null);
    try {
      const res = await adminApi.post<{ message?: string }>(`/bookings/${selected._id}/email-job-sheet`);
      setSheetMsg({ type: "ok", text: res.data?.message || "Email sent." });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setSheetMsg({
        type: "err",
        text: err?.response?.data?.message || "Could not send email. Check SMTP settings in frontend/backend/.env.",
      });
    }
  };

  const downloadInvoicePdf = async () => {
    if (!selected) return;
    setSheetMsg(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
      const r = await fetch(`/api/admin/bookings/${selected._id}/invoice.pdf`, {
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
      a.download = `invoice-${selected._id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSheetMsg({ type: "ok", text: "Invoice PDF downloaded." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not download invoice.";
      setSheetMsg({ type: "err", text: msg });
    }
  };

  const emailInvoicePdf = async () => {
    if (!selected) return;
    setSheetMsg(null);
    try {
      const res = await adminApi.post<{ message?: string }>(`/bookings/${selected._id}/email-invoice`);
      setSheetMsg({ type: "ok", text: res.data?.message || "Invoice emailed." });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setSheetMsg({
        type: "err",
        text: err?.response?.data?.message || "Could not send invoice email.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Booking Management</h1>
      <div className="card flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-end">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">From (service date)</label>
          <input
            type="date"
            className="rounded-lg border border-zinc-300 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-800"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">To (optional range)</label>
          <input
            type="date"
            className="rounded-lg border border-zinc-300 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-800"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-zinc-300 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-800"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All status</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
        <select
          className="rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
        >
          <option value="">All payments</option>
          <option value="unpaid">Payment due</option>
          <option value="partial">Partially paid</option>
          <option value="paid">Paid in full</option>
          <option value="waived">Waived</option>
        </select>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
          onClick={() => {
            setDateFrom("");
            setDateTo("");
          }}
        >
          Clear dates
        </button>
      </div>
      {statusMsg && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {statusMsg}
        </p>
      )}
      {loadError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-red-100 px-3 py-1 font-semibold text-red-900 hover:bg-red-200 dark:bg-red-900/60 dark:text-red-100"
          >
            Retry
          </button>
        </div>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Click <strong>Open</strong> to expand the job sheet and inspection photos <strong>under that booking</strong>. Click{" "}
        <strong>Close</strong> to collapse.
      </p>
      {loading ? (
        <div className="card p-10 text-center text-sm text-zinc-500">
          Loading bookings…
        </div>
      ) : bookings.length === 0 ? (
        <div className="card p-10 text-center text-zinc-500 dark:text-zinc-400">
          <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">No bookings found</p>
          <p className="mt-1 text-sm">There are no bookings matching your selected filters.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {bookings.map((booking) => {
            const isOpen = selected?._id === booking._id;
            return (
              <div
                key={booking._id}
                className={`card overflow-hidden p-0 transition-[box-shadow] ${
                  isOpen ? "shadow-md ring-2 ring-amber-400/45 dark:ring-amber-500/35" : ""
                }`}
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {booking.customerName} — {booking.serviceId?.name || (booking as unknown as { serviceName?: string }).serviceName || "Service"}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-600 dark:text-zinc-400">
                        {booking.date} {booking.time} · {booking.status}
                      </p>
                    </div>
                    <BookingCustomerSummary booking={booking} />
                  </div>
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusPillClass(booking.paymentStatus)}`}
                      >
                        {paymentStatusLabel(booking.paymentStatus)}
                      </span>
                      {booking.finalAmount != null && booking.finalAmount > 0 ? (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                          {formatInr(booking.finalAmount)}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {(["Pending", "In Progress", "Completed"] as const).map((status) => {
                        const active = booking.status === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                              active
                                ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/80 dark:bg-amber-500 dark:text-zinc-950 dark:ring-amber-300/60"
                                : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            }`}
                            onClick={() => void updateStatus(booking._id, status)}
                          >
                            {status}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                          isOpen
                            ? "border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-500/60 dark:bg-amber-950/30 dark:text-amber-100"
                            : "border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                        }`}
                        onClick={() => toggleDetails(booking)}
                      >
                        {isOpen ? "Close" : "Open"}
                      </button>
                    </div>
                  </div>
                </div>
                {isOpen && selected && (
                  <div
                    ref={openPanelRef}
                    className="space-y-5 border-t border-zinc-200/90 bg-gradient-to-b from-zinc-50/90 to-white p-4 sm:p-6 dark:border-zinc-700/90 dark:from-zinc-950/50 dark:to-zinc-900/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Job sheet</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{selected.customerName}</h2>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {selected.serviceId?.name || (selected as unknown as { serviceName?: string }).serviceName || "Service"}
                          </span>
                          {" · "}
                          {selected.date} {selected.time}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-mono text-[11px] text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        …{(selected._id || "").slice(-10)}
                      </span>
                    </div>
                  <div className="rounded-2xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70">
                    <BookingCustomerSummary booking={selected} />
                  </div>

                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/25 dark:text-amber-100">
                    Before photos are <strong>required</strong> before you can set status to <strong>In Progress</strong>.
                  </div>

                  <section className="space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Inspection gallery</h3>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">JPG, PNG, WebP, HEIC</span>
                    </div>
                    {uploadErr && (
                      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                        {uploadErr}
                      </p>
                    )}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="flex flex-col rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/95 to-white p-4 shadow-sm dark:border-amber-800/45 dark:from-amber-950/35 dark:to-zinc-900/90">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">Before service</p>
                            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">Vehicle condition before work</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-950 dark:bg-amber-950/70 dark:text-amber-200">
                            {inspection?.beforeImages?.length ?? 0}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
                            <input
                              ref={beforeInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/heic"
                              multiple
                              className="sr-only"
                              disabled={uploadBusy !== null}
                              onChange={(e) => void upload("before", e.target.files)}
                            />
                            {uploadBusy === "before" ? "Uploading…" : "Add photos"}
                          </label>
                          <button
                            type="button"
                            className="rounded-xl border border-amber-300/80 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50 dark:border-amber-700 dark:bg-zinc-900 dark:text-amber-200 dark:hover:bg-zinc-800"
                            disabled={uploadBusy !== null}
                            onClick={() => beforeInputRef.current?.click()}
                          >
                            Browse
                          </button>
                        </div>
                        {(inspection?.beforeImages?.length ?? 0) > 0 ? (
                          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {inspection?.beforeImages?.map((i, idx) => (
                              <a
                                key={idx}
                                href={i.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80 transition hover:ring-2 hover:ring-amber-400/60 dark:bg-zinc-800 dark:ring-zinc-700"
                              >
                                <img
                                  src={i.url}
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                  alt={`Before ${idx + 1}`}
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 flex aspect-[16/7] items-center justify-center rounded-xl border border-dashed border-amber-300/70 bg-white/50 text-xs text-zinc-500 dark:border-amber-800/50 dark:bg-zinc-950/30 dark:text-zinc-500">
                            No before photos yet
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/80 to-white p-4 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/25 dark:to-zinc-900/90">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">After service</p>
                            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">Finished work — add when complete</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200">
                            {inspection?.afterImages?.length ?? 0}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border-2 border-emerald-700/80 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60">
                            <input
                              ref={afterInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/heic"
                              multiple
                              className="sr-only"
                              disabled={uploadBusy !== null}
                              onChange={(e) => void upload("after", e.target.files)}
                            />
                            {uploadBusy === "after" ? "Uploading…" : "Add photos"}
                          </label>
                          <button
                            type="button"
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            disabled={uploadBusy !== null}
                            onClick={() => afterInputRef.current?.click()}
                          >
                            Browse
                          </button>
                        </div>
                        {(inspection?.afterImages?.length ?? 0) > 0 ? (
                          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {inspection?.afterImages?.map((i, idx) => (
                              <a
                                key={idx}
                                href={i.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80 transition hover:ring-2 hover:ring-emerald-400/50 dark:bg-zinc-800 dark:ring-zinc-700"
                              >
                                <img
                                  src={i.url}
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                  alt={`After ${idx + 1}`}
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 flex aspect-[16/7] items-center justify-center rounded-xl border border-dashed border-emerald-300/60 bg-white/50 text-xs text-zinc-500 dark:border-emerald-900/45 dark:bg-zinc-950/30 dark:text-zinc-500">
                            No after photos yet
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <div className="rounded-2xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Work log</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Services done (comma-separated)</span>
                        <input
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                          value={servicesDone}
                          onChange={(e) => setServicesDone(e.target.value)}
                          placeholder="Oil change, brake pads…"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Parts used (comma-separated)</span>
                        <input
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                          value={partsUsed}
                          onChange={(e) => setPartsUsed(e.target.value)}
                          placeholder="Filter, pads…"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Extra charges (INR)</span>
                        <input
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                          type="number"
                          min={0}
                          step={1}
                          value={extraCharges}
                          onChange={(e) => setExtraCharges(e.target.value)}
                          placeholder="Add-on amount"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Notes</span>
                        <input
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Internal notes"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border-2 border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-white p-4 dark:border-emerald-800/50 dark:from-emerald-950/30 dark:to-zinc-900/80">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">Payment & P&L</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      <strong className="font-medium text-zinc-800 dark:text-zinc-200">Linked to dashboard:</strong> Income uses{" "}
                      <strong className="font-medium text-zinc-800 dark:text-zinc-200">final amount</strong> on this booking. Direct costs use{" "}
                      <strong className="font-medium text-zinc-800 dark:text-zinc-200">spare parts</strong> +{" "}
                      <strong className="font-medium text-zinc-800 dark:text-zinc-200">other costs</strong> stored on the job card (same save). Profit =
                      income − those costs. Counts in admin P&amp;L when status is{" "}
                      <strong className="font-medium text-zinc-800 dark:text-zinc-200">Completed</strong> and the service date is in your reporting
                      period. Payment <strong className="font-medium text-zinc-800 dark:text-zinc-200">status</strong> below drives the dashboard payment
                      summary; income/cost math is unchanged.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Payment status</label>
                        <select
                          className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                          value={paymentStatusInput}
                          onChange={(e) => setPaymentStatusInput(e.target.value as Booking["paymentStatus"])}
                        >
                          {PAYMENT_STATUSES.map((v) => (
                            <option key={v} value={v}>
                              {PAYMENT_STATUS_LABELS[v]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Payment option</label>
                        <select
                          className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          <option value="">—</option>
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Card">Card</option>
                          <option value="Net banking">Net banking</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Final amount received (INR)</label>
                        <input
                          className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 dark:border-zinc-600 dark:bg-zinc-800"
                          type="number"
                          min={0}
                          step={1}
                          value={finalAmountInput}
                          onChange={(e) => setFinalAmountInput(e.target.value)}
                          placeholder="e.g. 8500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Spare parts cost (INR)</label>
                        <input
                          className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 dark:border-zinc-600 dark:bg-zinc-800"
                          type="number"
                          min={0}
                          step={1}
                          value={partsCostInr}
                          onChange={(e) => setPartsCostInr(e.target.value)}
                          placeholder=""
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Other direct costs (INR)</label>
                        <input
                          className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 dark:border-zinc-600 dark:bg-zinc-800"
                          type="number"
                          min={0}
                          step={1}
                          value={miscCostsInr}
                          onChange={(e) => setMiscCostsInr(e.target.value)}
                          placeholder=""
                        />
                      </div>
                    </div>

                    <div className="mt-4 border-t border-emerald-200/80 pt-4 dark:border-emerald-800/40">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/90 dark:text-emerald-400/90">
                        Payment details (optional)
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
                        For your records only — does not change how income or costs are calculated.
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Reference (txn ID, UPI ref, receipt #)
                          </label>
                          <input
                            className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 dark:border-zinc-600 dark:bg-zinc-800"
                            type="text"
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="Optional"
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Payment received on</label>
                          <input
                            className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 dark:border-zinc-600 dark:bg-zinc-800"
                            type="date"
                            value={paymentReceivedYmd}
                            onChange={(e) => setPaymentReceivedYmd(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Estimated profit on this job:{" "}
                      <span className="tabular-nums text-emerald-800 dark:text-emerald-300">
                        {formatInr(
                          (() => {
                            const fa = Number(finalAmountInput);
                            const inc = Number.isFinite(fa) ? Math.max(0, fa) : 0;
                            const pc = inrInputToNumber(partsCostInr);
                            const mc = inrInputToNumber(miscCostsInr);
                            return inc - pc - mc;
                          })()
                        )}
                      </span>
                    </p>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:w-auto"
                      disabled={plSaving}
                      onClick={() => void savePaymentAndPL()}
                    >
                      {plSaving ? "Saving…" : "Save payment & P&L"}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      onClick={() => void downloadJobSheetPdf()}
                    >
                      Job sheet PDF
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      onClick={() => void downloadInvoicePdf()}
                    >
                      Invoice PDF
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-amber-600 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-500/60 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
                      onClick={() => void emailJobSheetPdf()}
                    >
                      Email job sheet
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
                      onClick={() => void emailInvoicePdf()}
                    >
                      Email invoice
                    </button>
                  </div>
                  {sheetMsg && (
                    <p
                      className={`text-sm ${
                        sheetMsg.type === "ok" ? "text-green-800 dark:text-green-300" : "text-red-700 dark:text-red-300"
                      }`}
                    >
                      {sheetMsg.text}
                    </p>
                  )}
                  {jobCardMsg && (
                    <p
                      className={`text-sm ${
                        jobCardMsg.type === "ok"
                          ? "text-green-800 dark:text-green-300"
                          : "text-red-700 dark:text-red-300"
                      }`}
                    >
                      {jobCardMsg.text}
                    </p>
                  )}
                  <button
                    type="button"
                    className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    disabled={jobCardSaving}
                    onClick={() => void saveJobCard()}
                  >
                    {jobCardSaving ? "Saving…" : "Save Job Card"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-4 text-sm text-zinc-500">Loading bookings…</div>}>
      <AdminBookingsPageContent />
    </Suspense>
  );
}
