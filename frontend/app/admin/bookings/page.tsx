"use client";
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Booking } from "@/lib/types";

type Inspection = {
  beforeImages: { url: string }[];
  afterImages: { url: string }[];
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [servicesDone, setServicesDone] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [extraCharges, setExtraCharges] = useState(0);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    const res = await adminApi.get("/bookings", { params: { date: date || undefined, status: statusFilter || undefined } });
    setBookings(res.data);
  }, [date, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await adminApi.put(`/booking/status/${id}`, { status });
    load();
  };

  const upload = async (type: "before" | "after", files: FileList | null) => {
    if (!selected || !files?.length) return;
    const formData = new FormData();
    formData.append("type", type);
    Array.from(files).forEach((file) => formData.append("images", file));
    await adminApi.post(`/upload-images/${selected._id}`, formData);
    openDetails(selected);
  };

  const saveJobCard = async () => {
    if (!selected) return;
    await adminApi.post(`/job-card/${selected._id}`, {
      servicesDone: servicesDone.split(",").map((v) => v.trim()).filter(Boolean),
      partsUsed: partsUsed.split(",").map((v) => v.trim()).filter(Boolean),
      extraCharges,
      notes,
    });
  };

  const openDetails = async (booking: Booking) => {
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
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Booking Management</h1>
      <div className="card flex flex-wrap gap-3 p-4">
        <input type="date" className="rounded-lg border p-2" value={date} onChange={(e) => setDate(e.target.value)} />
        <select className="rounded-lg border p-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All status</option><option>Pending</option><option>In Progress</option><option>Completed</option>
        </select>
      </div>
      <div className="grid gap-2">
        {bookings.map((booking) => (
          <div key={booking._id} className="card flex flex-wrap items-center justify-between gap-2 p-4">
            <div>
              <p className="font-semibold">{booking.customerName} - {booking.serviceId?.name}</p>
              <p className="text-sm text-gray-600">{booking.date} {booking.time} | {booking.status}</p>
            </div>
            <div className="flex gap-2">
              {["Pending", "In Progress", "Completed"].map((status) => (
                <button key={status} className="rounded-lg bg-black px-3 py-2 text-xs text-white" onClick={() => updateStatus(booking._id, status)}>
                  {status}
                </button>
              ))}
              <button className="rounded-lg border px-3 py-2 text-xs" onClick={() => openDetails(booking)}>Open</button>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="card space-y-3 p-5">
          <h2 className="text-xl font-semibold">Job Card & Inspection ({selected._id})</h2>
          <p className="text-sm text-gray-600">Before images are mandatory before changing status to In Progress.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="mb-1 block text-sm">Upload BEFORE images</label><input type="file" multiple onChange={(e) => upload("before", e.target.files)} /></div>
            <div><label className="mb-1 block text-sm">Upload AFTER images</label><input type="file" multiple onChange={(e) => upload("after", e.target.files)} /></div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded-lg border p-2" value={servicesDone} onChange={(e) => setServicesDone(e.target.value)} placeholder="services done (comma-separated)" />
            <input className="rounded-lg border p-2" value={partsUsed} onChange={(e) => setPartsUsed(e.target.value)} placeholder="parts used (comma-separated)" />
            <input className="rounded-lg border p-2" type="number" value={extraCharges} onChange={(e) => setExtraCharges(Number(e.target.value))} placeholder="extra charges" />
            <input className="rounded-lg border p-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="notes" />
          </div>
          <button className="rounded-lg bg-black px-4 py-2 text-white" onClick={saveJobCard}>Save Job Card</button>
          <div className="grid gap-3 md:grid-cols-2">
            <div><p className="font-medium">Before service</p><div className="mt-2 flex flex-wrap gap-2">{inspection?.beforeImages?.map((i, idx) => <img key={idx} src={i.url} className="h-20 w-20 rounded object-cover" alt="before" />)}</div></div>
            <div><p className="font-medium">After service</p><div className="mt-2 flex flex-wrap gap-2">{inspection?.afterImages?.map((i, idx) => <img key={idx} src={i.url} className="h-20 w-20 rounded object-cover" alt="after" />)}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
