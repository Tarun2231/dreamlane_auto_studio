"use client";

import { useMemo } from "react";
import {
  SLOT_WEEKDAYS,
  isTodayYmd,
  monthGridCells,
  toYmd,
} from "@/lib/slotCalendarUtils";

type Props = {
  viewY: number;
  viewM: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  activeDate: string | null;
  /** Days that have at least one slot (any status). */
  datesWithSlots: Set<string>;
  /** If set, days with only disabled slots show an amber dot; available days stay green. */
  datesWithAvailable?: Set<string>;
  onDayClick: (ymd: string) => void;
};

export default function SlotCalendarGrid({
  viewY,
  viewM,
  onPrevMonth,
  onNextMonth,
  activeDate,
  datesWithSlots,
  datesWithAvailable,
  onDayClick,
}: Props) {
  const cells = useMemo(() => monthGridCells(viewY, viewM), [viewY, viewM]);

  const monthLabel = new Date(viewY, viewM, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const dotFor = (ymd: string) => {
    if (!datesWithSlots.has(ymd)) return null;
    if (datesWithAvailable != null) {
      if (datesWithAvailable.has(ymd)) return "emerald" as const;
      return "amber" as const;
    }
    return "emerald" as const;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-3 dark:border-zinc-700">
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={onPrevMonth}
          aria-label="Previous month"
        >
          ←
        </button>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{monthLabel}</p>
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={onNextMonth}
          aria-label="Next month"
        >
          →
        </button>
      </div>
      <div className="p-2">
        <div className="mb-2 grid grid-cols-7">
          {SLOT_WEEKDAYS.map((w) => (
            <div
              key={w}
              className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`e-${i}`} className="aspect-square min-h-[2.25rem]" />;
            }
            const ymd = toYmd(viewY, viewM, day);
            const has = datesWithSlots.has(ymd);
            const isSelectedDay = activeDate === ymd;
            const today = isTodayYmd(viewY, viewM, day);
            const dot = dotFor(ymd);
            return (
              <button
                key={ymd}
                type="button"
                disabled={!has}
                onClick={() => has && onDayClick(ymd)}
                className={`relative flex aspect-square min-h-[2.25rem] items-center justify-center rounded-xl text-sm font-medium transition ${
                  !has
                    ? "cursor-not-allowed text-zinc-300 dark:text-zinc-600"
                    : isSelectedDay
                      ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900"
                      : "text-zinc-800 hover:bg-amber-50 dark:text-zinc-100 dark:hover:bg-amber-950/40"
                } ${today && has && !isSelectedDay ? "ring-1 ring-amber-400/70 dark:ring-amber-500/50" : ""}`}
              >
                {day}
                {dot === "emerald" && (
                  <span
                    className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
                    aria-hidden
                  />
                )}
                {dot === "amber" && (
                  <span
                    className="absolute bottom-1 h-1 w-1 rounded-full bg-amber-500 dark:bg-amber-400"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
