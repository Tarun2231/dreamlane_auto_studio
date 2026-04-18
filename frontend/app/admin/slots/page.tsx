"use client";

import { type FormEvent, useEffect, useState } from "react";
import { adminApi, api } from "@/lib/api";
import { Slot } from "@/lib/types";

export default function AdminSlotsPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Slot[]>("/slots").then((res) => setSlots(res.data));
  useEffect(() => void load(), []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!date || !time) {
      setError("Pick both date and time.");
      return;
    }
    try {
      await adminApi.post("/slots", { date, time, isAvailable: true });
      setDate("");
      setTime("");
      await load();
    } catch {
      setError("Could not create slot (duplicate date/time or server error).");
    }
  };

  const toggle = async (slot: Slot) => {
    await adminApi.put(`/slots/${slot._id}`, { isAvailable: !slot.isAvailable });
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Slot Management</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <form onSubmit={create} className="card flex flex-wrap items-end gap-3 p-5">
        <div>
          <label className="mb-1 block text-xs text-gray-600">Date</label>
          <input className="rounded-xl border p-3" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Time</label>
          <input className="rounded-xl border p-3" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <button type="submit" className="rounded-xl bg-black px-5 py-3 text-white">
          Create Slot
        </button>
      </form>
      <div className="grid gap-2">
        {slots.map((slot) => (
          <div key={slot._id} className="card flex flex-wrap items-center justify-between gap-2 p-4">
            <p>
              {slot.date} — {slot.time}{" "}
              <span className={slot.isAvailable ? "text-green-700" : "text-gray-500"}>
                ({slot.isAvailable ? "available" : "disabled"})
              </span>
            </p>
            <button type="button" className="rounded-lg bg-black px-3 py-2 text-sm text-white" onClick={() => void toggle(slot)}>
              {slot.isAvailable ? "Disable" : "Enable"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
