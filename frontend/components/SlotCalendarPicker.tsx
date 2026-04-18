"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Slot } from "@/lib/types";
import SlotCalendarGrid from "@/components/SlotCalendarGrid";

type Props = {
  slots: Slot[];
  loading: boolean;
  selectedSlotId: string;
  onSelectSlot: (slot: Slot) => void;
  onClearSlot: () => void;
};

export default function SlotCalendarPicker({
  slots,
  loading,
  selectedSlotId,
  onSelectSlot,
  onClearSlot,
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

  const firstAvailableYmd = useMemo(() => {
    const u = [...datesWithSlots].sort();
    return u[0] ?? null;
  }, [datesWithSlots]);

  const [viewY, setViewY] = useState(() => new Date().getFullYear());
  const [viewM, setViewM] = useState(() => new Date().getMonth());
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const didJumpToFirstMonth = useRef(false);

  useEffect(() => {
    if (didJumpToFirstMonth.current || !firstAvailableYmd || slots.length === 0) return;
    didJumpToFirstMonth.current = true;
    const [y, m] = firstAvailableYmd.split("-").map(Number);
    setViewY(y);
    setViewM(m - 1);
  }, [firstAvailableYmd, slots.length]);

  useEffect(() => {
    const sel = slots.find((s) => s._id === selectedSlotId);
    if (sel) {
      setActiveDate(sel.date);
      const [y, m] = sel.date.split("-").map(Number);
      setViewY(y);
      setViewM(m - 1);
    }
  }, [selectedSlotId, slots]);

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
    onClearSlot();
  };

  const timesForActive = activeDate ? byDate.get(activeDate) ?? [] : [];

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        Loading availability…
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        No open slots right now. Ask the shop to add availability, then tap Refresh.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <SlotCalendarGrid
        viewY={viewY}
        viewM={viewM}
        onPrevMonth={goPrevMonth}
        onNextMonth={goNextMonth}
        activeDate={activeDate}
        datesWithSlots={datesWithSlots}
        onDayClick={handleDayClick}
      />

      {activeDate && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Times on{" "}
            <span className="font-semibold text-amber-800 dark:text-amber-400">
              {new Date(activeDate + "T12:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </p>
          {timesForActive.length === 0 ? (
            <p className="text-sm text-zinc-500">No times for this day.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {timesForActive.map((slot) => {
                const picked = selectedSlotId === slot._id;
                return (
                  <button
                    key={slot._id}
                    type="button"
                    onClick={() => onSelectSlot(slot)}
                    className={`min-h-[44px] min-w-[5.5rem] rounded-xl border px-4 py-2 font-mono text-sm font-semibold transition ${
                      picked
                        ? "border-amber-600 bg-amber-50 text-amber-950 shadow-sm dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-100"
                        : "border-zinc-200 bg-white text-zinc-900 hover:border-amber-400/80 hover:bg-amber-50/50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!activeDate && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Choose a day with a green dot to see open times.</p>
      )}
    </div>
  );
}
