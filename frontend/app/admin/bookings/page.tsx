"use client";
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminApi } from "@/lib/api";
import { Booking } from "@/lib/types";

type Inspection = {
  beforeImages: { url: string }[];
  afterImages: { url: string }[];
};

function telHref(phone: string) {
  return `tel:${phone.replace(/\s/g, "")}`;
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
          {booking.vehicleType} · {booking.carModel}
        </span>
      </p>
    </div>
  );
}

function AdminBookingsPageContent() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [servicesDone, setServicesDone] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [extraCharges, setExtraCharges] = useState(0);
  const [notes, setNotes] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [jobCardSaving, setJobCardSaving] = useState(false);
  const [jobCardMsg, setJobCardMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [finalAmountInput, setFinalAmountInput] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [sheetMsg, setSheetMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [uploadBusy, setUploadBusy] = useState<"before" | "after" | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const single = searchParams.get("date");
    const df = searchParams.get("dateFrom");
    const dt = searchParams.get("dateTo");
    const st = searchParams.get("status");
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
    const params: { date?: string; dateFrom?: string; dateTo?: string; status?: string } = {};
    if (statusFilter) params.status = statusFilter;
    if (dateFrom && dateTo) {
      params.dateFrom = dateFrom;
      params.dateTo = dateTo;
    } else if (dateFrom) {
      params.dateFrom = dateFrom;
    }
    const res = await adminApi.get("/bookings", { params });
    setBookings(res.data);
  }, [dateFrom, dateTo, statusFilter]);

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
        extraCharges: Number.isFinite(extraCharges) ? extraCharges : 0,
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
    const [jobCardRes, inspectionRes] = await Promise.all([
      adminApi.get(`/job-card/${booking._id}`),
      adminApi.get(`/inspection/${booking._id}`),
    ]);
    const jobCard = jobCardRes.data;
    setInspection(inspectionRes.data);
    setServicesDone((jobCard?.servicesDone || []).join(", "));
    setPartsUsed((jobCard?.partsUsed || []).join(", "));
    setExtraCharges(jobCard?.extraCharges || 0);
    setNotes(jobCard?.notes || "");
    setFinalAmountInput(
      booking.finalAmount != null && booking.finalAmount > 0 ? String(booking.finalAmount) : ""
    );
    setSheetMsg(null);
  };

  const saveFinalPayment = async () => {
    if (!selected) return;
    setPaymentSaving(true);
    setSheetMsg(null);
    try {
      const n = Number(finalAmountInput);
      await adminApi.put(`/booking/${selected._id}`, { finalAmount: Number.isFinite(n) ? n : 0 });
      setSheetMsg({ type: "ok", text: "Final payment amount saved." });
      await load();
      setSelected((s) =>
        s && s._id === selected._id ? { ...s, finalAmount: Number.isFinite(n) ? n : 0 } : s
      );
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setSheetMsg({ type: "err", text: err?.response?.data?.message || "Could not save payment." });
    } finally {
      setPaymentSaving(false);
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
        text: err?.response?.data?.message || "Could not send email. Check SMTP settings in backend/.env.",
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
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        To add <strong>before/after photos</strong> and the job sheet, click <strong>Open</strong> on a booking below.
      </p>
      <div className="grid gap-2">
        {bookings.map((booking) => (
          <div
            key={booking._id}
            className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {booking.customerName} — {booking.serviceId?.name}
                </p>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-zinc-400">
                  {booking.date} {booking.time} · {booking.status}
                </p>
              </div>
              <BookingCustomerSummary booking={booking} />
            </div>
            <div className="flex flex-wrap gap-2">
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
                  selected?._id === booking._id
                    ? "border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-500/60 dark:bg-amber-950/30 dark:text-amber-100"
                    : "border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                }`}
                onClick={() => void openDetails(booking)}
              >
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="card space-y-3 p-5">
          <div>
            <h2 className="text-xl font-semibold">Job Card & Inspection ({selected._id})</h2>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Customer</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{selected.customerName}</p>
              <div className="mt-3">
                <BookingCustomerSummary booking={selected} />
              </div>
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Service: <span className="font-medium text-zinc-700 dark:text-zinc-300">{selected.serviceId?.name}</span>
                {" · "}
                Slot: {selected.date} {selected.time}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            Before photos are <strong>required</strong> before you can set status to <strong>In Progress</strong>.
          </p>

          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">Inspection photos</h3>
            {uploadErr && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {uploadErr}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border-2 border-dashed border-amber-400/80 bg-amber-50 p-4 dark:border-amber-500/50 dark:bg-amber-950/25">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">Before service</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Upload one or more photos (JPG, PNG, WebP).</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
                    <input
                      ref={beforeInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic"
                      multiple
                      className="sr-only"
                      disabled={uploadBusy !== null}
                      onChange={(e) => void upload("before", e.target.files)}
                    />
                    {uploadBusy === "before" ? "Uploading…" : "Choose before photos"}
                  </label>
                  <button
                    type="button"
                    className="text-sm font-medium text-amber-800 underline dark:text-amber-400"
                    disabled={uploadBusy !== null}
                    onClick={() => beforeInputRef.current?.click()}
                  >
                    Or click to browse
                  </button>
                </div>
                {(inspection?.beforeImages?.length ?? 0) > 0 && (
                  <div className="mt-4 border-t border-amber-200/80 pt-3 dark:border-amber-800/40">
                    <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">Uploaded photos</p>
                    <div className="flex flex-wrap gap-2">
                      {inspection?.beforeImages?.map((i, idx) => (
                        <img key={idx} src={i.url} className="h-16 w-16 rounded border border-amber-200 object-cover dark:border-amber-800" alt="" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-600 dark:bg-zinc-900/50">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">After service</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Upload when work is finished.</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border-2 border-zinc-800 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
                    <input
                      ref={afterInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic"
                      multiple
                      className="sr-only"
                      disabled={uploadBusy !== null}
                      onChange={(e) => void upload("after", e.target.files)}
                    />
                    {uploadBusy === "after" ? "Uploading…" : "Choose after photos"}
                  </label>
                  <button
                    type="button"
                    className="text-sm font-medium text-zinc-700 underline dark:text-zinc-300"
                    disabled={uploadBusy !== null}
                    onClick={() => afterInputRef.current?.click()}
                  >
                    Or click to browse
                  </button>
                </div>
                {(inspection?.afterImages?.length ?? 0) > 0 && (
                  <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-600">
                    <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">Uploaded photos</p>
                    <div className="flex flex-wrap gap-2">
                      {inspection?.afterImages?.map((i, idx) => (
                        <img key={idx} src={i.url} className="h-16 w-16 rounded border border-zinc-200 object-cover dark:border-zinc-600" alt="" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded-lg border p-2" value={servicesDone} onChange={(e) => setServicesDone(e.target.value)} placeholder="services done (comma-separated)" />
            <input className="rounded-lg border p-2" value={partsUsed} onChange={(e) => setPartsUsed(e.target.value)} placeholder="parts used (comma-separated)" />
            <input className="rounded-lg border p-2" type="number" value={extraCharges} onChange={(e) => setExtraCharges(Number(e.target.value))} placeholder="extra charges (add-on amount)" />
            <input className="rounded-lg border p-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="notes" />
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Payment after service</p>
            <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
              Base price comes from the service. Extra charges add to the job sheet total. Record the final amount charged to the customer — it appears on the PDF.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">Final amount charged (INR)</label>
                <input
                  className="w-40 rounded-lg border border-zinc-300 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-800"
                  type="number"
                  min={0}
                  step={1}
                  value={finalAmountInput}
                  onChange={(e) => setFinalAmountInput(e.target.value)}
                  placeholder="e.g. 4500"
                />
              </div>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                disabled={paymentSaving}
                onClick={() => void saveFinalPayment()}
              >
                {paymentSaving ? "Saving…" : "Save payment"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              onClick={() => void downloadJobSheetPdf()}
            >
              Download job sheet (PDF)
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              onClick={() => void downloadInvoicePdf()}
            >
              Download invoice (PDF)
            </button>
            <button
              type="button"
              className="rounded-lg border border-amber-600 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-500/60 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
              onClick={() => void emailJobSheetPdf()}
            >
              Email job sheet (PDF) to customer
            </button>
            <button
              type="button"
              className="rounded-lg border border-emerald-700 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
              onClick={() => void emailInvoicePdf()}
            >
              Email invoice (PDF) to customer
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
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            disabled={jobCardSaving}
            onClick={() => void saveJobCard()}
          >
            {jobCardSaving ? "Saving…" : "Save Job Card"}
          </button>
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
