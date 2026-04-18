"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Slot } from "@/lib/types";
import SlotCalendarGrid from "@/components/SlotCalendarGrid";

type Props = {
  slots: Slot[];
  loading: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleDay: (dateKey: string) => void;
  onToggleAvailability: (slot: Slot) => void;
};

export default function AdminSlotCalendar({
  slots,
  loading,
  selected,
  onToggleSelect,
  onToggleDay,
  onToggleAvailability,
}: Props) {
  const byDate = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) {
      if (!m.has(s.date)) m.set(s.date, []);
      m.get(s.date)!.push(s);
    }
    for (const list of m.values()) {
      list.sort((a, b) => String(a.time).localeCompare(String(b.time)));
    }
    return m;
  }, [slots]);

  const datesWithSlots = useMemo(() => new Set(slots.map((s) => s.date)), [slots]);

  const datesWithAvailable = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      if (s.isAvailable) set.add(s.date);
    }
    return set;
  }, [slots]);

  const firstSlotYmd = useMemo(() => {
    const u = [...datesWithSlots].sort();
    return u[0] ?? null;
  }, [datesWithSlots]);

  const [viewY, setViewY] = useState(() => new Date().getFullYear());
  const [viewM, setViewM] = useState(() => new Date().getMonth());
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const didJump = useRef(false);

  useEffect(() => {
    if (didJump.current || !firstSlotYmd || slots.length === 0) return;
    didJump.current = true;
    const [y, m] = firstSlotYmd.split("-").map(Number);
    setViewY(y);
    setViewM(m - 1);
  }, [firstSlotYmd, slots.length]);

  useEffect(() => {
    if (activeDate && !datesWithSlots.has(activeDate)) {
      setActiveDate(null);
    }
  }, [activeDate, datesWithSlots]);

  const goPrevMonth = () => {
    setViewM((m) => {
      if (m === 0) {
        setViewY((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const goNextMonth = () => {
    setViewM((m) => {
      if (m === 11) {
        setViewY((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const handleDayClick = (ymd: string) => {
    if (!datesWithSlots.has(ymd)) return;
    setActiveDate(ymd);
  };

  const daySlots = activeDate ? byDate.get(activeDate) ?? [] : [];
  const allDaySelected =
    daySlots.length > 0 && daySlots.every((s) => selected.has(s._id));

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        Loading slots…
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        No slots yet. Use the form above to create some.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <strong>Green dot</strong> = at least one available time that day. <strong>Amber dot</strong> = only disabled
        times. Click a day to manage times below.
      </p>

      <SlotCalendarGrid
        viewY={viewY}
        viewM={viewM}
        onPrevMonth={goPrevMonth}
        onNextMonth={goNextMonth}
        activeDate={activeDate}
        datesWithSlots={datesWithSlots}
        datesWithAvailable={datesWithAvailable}
        onDayClick={handleDayClick}
      />

      {activeDate && (
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                {new Date(activeDate + "T12:00:00").toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {activeDate} · {daySlots.length} slot{daySlots.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              onClick={() => onToggleDay(activeDate)}
            >
              {allDaySelected ? "Deselect day" : "Select day"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[300px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  <th className="w-10 pb-2 pr-2">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="pb-2 pr-2">Time</th>
                  <th className="pb-2 pr-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {daySlots.map((slot) => (
                  <tr key={slot._id} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/80">
                    <td className="py-2 pr-2 align-middle">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-400"
                        checked={selected.has(slot._id)}
                        onChange={() => onToggleSelect(slot._id)}
                        aria-label={`Select ${slot.time}`}
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {slot.time}
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          slot.isAvailable
                            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        {slot.isAvailable ? "Available" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-2 text-right align-middle">
                      <button
                        type="button"
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                        onClick={() => onToggleAvailability(slot)}
                      >
                        {slot.isAvailable ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!activeDate && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Select a day on the calendar to view and edit slots.</p>
      )}
    </div>
  );
}
