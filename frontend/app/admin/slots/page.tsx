"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import AdminSlotCalendar from "@/components/AdminSlotCalendar";
import { adminApi, api } from "@/lib/api";
import { Slot } from "@/lib/types";

function sortSlots(a: Slot, b: Slot) {
  const dc = a.date.localeCompare(b.date);
  if (dc !== 0) return dc;
  return String(a.time).localeCompare(String(b.time));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Inclusive day count between two YYYY-MM-DD strings (valid range only). */
function inclusiveDayCount(from: string, to: string): number {
  if (!from || !to || from > to) return 0;
  const a = new Date(from + "T12:00:00");
  const b = new Date(to + "T12:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  let n = 0;
  const d = new Date(a);
  while (d <= b) {
    n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

type TimeRow = { id: string; value: string };

export default function AdminSlotsPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeRows, setTimeRows] = useState<TimeRow[]>([
    { id: uid(), value: "09:00" },
    { id: uid(), value: "14:00" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = () =>
    api
      .get<Slot[]>("/slots")
      .then((res) => setSlots(res.data))
      .finally(() => setSlotsLoading(false));
  useEffect(() => void load(), []);

  const sortedSlots = useMemo(() => [...slots].sort(sortSlots), [slots]);

  const slotsByDate = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of sortedSlots) {
      if (!m.has(s.date)) m.set(s.date, []);
      m.get(s.date)!.push(s);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, list]) => [date, [...list].sort((x, y) => String(x.time).localeCompare(String(y.time)))] as const);
  }, [sortedSlots]);

  const nonEmptyTimes = useMemo(
    () => timeRows.map((r) => r.value.trim()).filter(Boolean),
    [timeRows]
  );
  const dayCount = inclusiveDayCount(dateFrom, dateTo);
  const previewTotal = dayCount > 0 && nonEmptyTimes.length > 0 ? dayCount * nonEmptyTimes.length : 0;

  const addTimeRow = () => {
    setTimeRows((rows) => [...rows, { id: uid(), value: "" }]);
  };

  const removeTimeRow = (id: string) => {
    setTimeRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  };

  const updateTimeRow = (id: string, value: string) => {
    setTimeRows((rows) => rows.map((r) => (r.id === id ? { ...r, value } : r)));
  };

  const createRange = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!dateFrom || !dateTo) {
      setError("Choose both a start date and an end date.");
      return;
    }
    if (dateFrom > dateTo) {
      setError("Start date must be on or before the end date.");
      return;
    }
    const times = nonEmptyTimes;
    if (times.length === 0) {
      setError("Add at least one availability time.");
      return;
    }
    setCreateBusy(true);
    try {
      const res = await adminApi.post<{
        created: number;
        skippedDuplicates: number;
        days: number;
        timesUsed: string[];
      }>("/slots/bulk-create", {
        dateFrom,
        dateTo,
        times,
      });
      const { created, skippedDuplicates, days, timesUsed } = res.data;
      setSuccess(
        `Created ${created} slot(s) across ${days} day(s) and ${timesUsed.length} time(s).` +
          (skippedDuplicates > 0 ? ` Skipped ${skippedDuplicates} duplicate(s) that already existed.` : "")
      );
      await load();
    } catch {
      setError("Could not create slots. Check the range, times, and server logs.");
    } finally {
      setCreateBusy(false);
    }
  };

  const toggle = async (slot: Slot) => {
    await adminApi.put(`/slots/${slot._id}`, { isAvailable: !slot.isAvailable });
    await load();
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = sortedSlots.length > 0 && selected.size === sortedSlots.length;
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedSlots.map((s) => s._id)));
    }
  };

  const toggleDaySelection = (dateKey: string) => {
    const daySlots = slotsByDate.find(([d]) => d === dateKey)?.[1] ?? [];
    const ids = daySlots.map((s) => s._id);
    if (ids.length === 0) return;
    const allInDay = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allInDay) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const runBulk = async (action: "enable" | "disable" | "delete") => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (action === "delete") {
      const ok = window.confirm(`Delete ${ids.length} slot(s)? This cannot be undone.`);
      if (!ok) return;
    }
    setBulkBusy(true);
    setError(null);
    try {
      await adminApi.post("/slots/bulk", { ids, action });
      setSelected(new Set());
      await load();
    } catch {
      setError(
        action === "delete"
          ? "Could not delete slots."
          : "Could not update slots. Try again or check the server."
      );
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Slot Management</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Pick a <strong>date range</strong> (inclusive), then add one or more <strong>times</strong>. A slot is created for
        every day in the range at each time (e.g. Mon–Fri with 09:00 and 15:00 → 10 slots). Existing date/time pairs are
        skipped automatically.
      </p>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          {success}
        </p>
      )}

      <form onSubmit={createRange} className="card space-y-4 p-5">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Create slots</p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">From</label>
            <input
              className="rounded-xl border border-zinc-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">To</label>
            <input
              className="rounded-xl border border-zinc-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Availability times (one slot per day at each time)
          </label>
          <div className="space-y-2">
            {timeRows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-2">
                <input
                  className="rounded-xl border border-zinc-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
                  type="time"
                  value={row.value}
                  onChange={(e) => updateTimeRow(row.id, e.target.value)}
                  aria-label="Slot time"
                />
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => removeTimeRow(row.id)}
                  disabled={timeRows.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-amber-800 underline dark:text-amber-400"
            onClick={addTimeRow}
          >
            + Add another time
          </button>
        </div>

        {previewTotal > 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Up to <strong>{previewTotal}</strong> new slot(s) ({dayCount} day{dayCount === 1 ? "" : "s"} ×{" "}
            {nonEmptyTimes.length} time{nonEmptyTimes.length === 1 ? "" : "s"}). Duplicates are skipped.
          </p>
        )}

        <button
          type="submit"
          disabled={createBusy}
          className="rounded-xl bg-black px-5 py-3 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {createBusy ? "Creating…" : "Create slots"}
        </button>
      </form>

      {sortedSlots.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-400"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all slots"
              />
              Select all
            </label>
            {someSelected && (
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{selected.size} selected</span>
            )}
          </div>
          {someSelected && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={bulkBusy}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                onClick={() => void runBulk("enable")}
              >
                Enable selected
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                className="rounded-lg bg-zinc-700 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                onClick={() => void runBulk("disable")}
              >
                Disable selected
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
                onClick={() => void runBulk("delete")}
              >
                Delete selected
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Existing slots</h2>
        <AdminSlotCalendar
          slots={sortedSlots}
          loading={slotsLoading}
          selected={selected}
          onToggleSelect={toggleOne}
          onToggleDay={toggleDaySelection}
          onToggleAvailability={(slot) => void toggle(slot)}
        />
      </div>
    </div>
  );
}
