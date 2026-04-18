"use client";

export type DashboardPeriodType = "day" | "week" | "month" | "year" | "overall" | "range";

type ChipActive = {
  today: boolean;
  yesterday: boolean;
  week: boolean;
  month: boolean;
  prevMonth: boolean;
  year: boolean;
  all: boolean;
  last7: boolean;
  last30: boolean;
  range: boolean;
};

type ToolbarPresetKind =
  | "last7"
  | "last30"
  | "yesterday"
  | "today"
  | "week"
  | "month"
  | "prevMonth"
  | "year"
  | "all"
  | "range";

export default function DashboardPeriodControls({
  periodType,
  onPeriodChange,
  refDate,
  onRefDateChange,
  rangeFrom,
  onRangeFromChange,
  rangeTo,
  onRangeToChange,
  chipActive,
  periodRangeHint,
  periodCompletionPct,
  presetToday,
  presetWeek,
  presetMonth,
  presetYear,
  presetAllTime,
  presetYesterday,
  presetLast7,
  presetLast30,
  presetPrevMonth,
  variant = "card",
}: {
  periodType: DashboardPeriodType;
  onPeriodChange: (next: DashboardPeriodType) => void;
  refDate: string;
  onRefDateChange: (ymd: string) => void;
  rangeFrom: string;
  onRangeFromChange: (ymd: string) => void;
  rangeTo: string;
  onRangeToChange: (ymd: string) => void;
  chipActive: ChipActive;
  periodRangeHint: string;
  periodCompletionPct: number | null;
  presetToday: () => void;
  presetWeek: () => void;
  presetMonth: () => void;
  presetYear: () => void;
  presetAllTime: () => void;
  presetYesterday: () => void;
  presetLast7: () => void;
  presetLast30: () => void;
  presetPrevMonth: () => void;
  variant?: "card" | "toolbar";
}) {
  const presetHandlers: Record<ToolbarPresetKind, () => void> = {
    last7: presetLast7,
    last30: presetLast30,
    yesterday: presetYesterday,
    today: presetToday,
    week: presetWeek,
    month: presetMonth,
    prevMonth: presetPrevMonth,
    year: presetYear,
    all: presetAllTime,
    range: () => onPeriodChange("range"),
  };

  const activePresetKey: ToolbarPresetKind | "" = chipActive.last7
    ? "last7"
    : chipActive.last30
      ? "last30"
      : chipActive.yesterday
        ? "yesterday"
        : chipActive.today
          ? "today"
          : chipActive.week
            ? "week"
            : chipActive.prevMonth
              ? "prevMonth"
              : chipActive.month
                ? "month"
                : chipActive.year
                  ? "year"
                  : chipActive.all
                    ? "all"
                    : chipActive.range
                      ? "range"
                      : "";

  const toolbarTitle = [
    periodRangeHint,
    periodCompletionPct != null ? `${periodCompletionPct}% of jobs in range completed` : "",
    "Income, costs, vehicle mix, quote counts, and fleet stats follow this period. “Needs attention” is a live snapshot (not filtered by dates).",
  ]
    .filter(Boolean)
    .join(" · ");

  if (variant === "toolbar") {
    const onPresetSelect = (raw: string) => {
      if (raw === "custom" || !(raw in presetHandlers)) return;
      presetHandlers[raw as ToolbarPresetKind]();
    };

    const fieldBase =
      "box-border min-h-11 h-11 border-0 bg-transparent text-sm text-zinc-900 outline-none dark:text-zinc-100";

    return (
      <div
        className="flex w-full min-w-0 max-w-full items-stretch overflow-x-auto overflow-y-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-800"
        role="group"
        aria-label="Reporting period"
        title={toolbarTitle}
      >
        <span className="sr-only">Reporting period</span>

        <div
          className="flex w-11 shrink-0 items-center justify-center border-r border-zinc-200 bg-zinc-50/90 dark:border-zinc-700 dark:bg-zinc-900/60"
          aria-hidden
        >
          <svg className="h-5 w-5 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5"
            />
          </svg>
        </div>

        <div className="relative min-w-0 flex-1">
          <label htmlFor="dash-preset-toolbar" className="sr-only">
            Reporting period
          </label>
          <select
            id="dash-preset-toolbar"
            className={`${fieldBase} w-full cursor-pointer appearance-none px-3 pr-9 font-medium hover:bg-zinc-50/80 focus:bg-zinc-50 focus:ring-2 focus:ring-inset focus:ring-zinc-300/80 dark:hover:bg-zinc-900/40 dark:focus:bg-zinc-900/50 dark:focus:ring-zinc-600`}
            value={activePresetKey || "custom"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "custom") return;
              onPresetSelect(v);
            }}
          >
            <option value="custom">Custom (use dates below)</option>
            <optgroup label="Rolling">
              <option value="last7">Last 7 days (incl. today)</option>
              <option value="last30">Last 30 days (incl. today)</option>
            </optgroup>
            <optgroup label="Single day">
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
            </optgroup>
            <optgroup label="Calendar">
              <option value="week">This week (Mon–Sun)</option>
              <option value="month">This month</option>
              <option value="prevMonth">Previous month</option>
              <option value="year">This year</option>
            </optgroup>
            <optgroup label="Totals">
              <option value="all">All time — every booking</option>
            </optgroup>
            <optgroup label="Custom range">
              <option value="range">Pick start & end…</option>
            </optgroup>
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" aria-hidden>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </span>
        </div>

        {periodType !== "overall" && periodType !== "range" && (
          <div className="flex shrink-0 items-stretch border-l border-zinc-200 dark:border-zinc-700">
            <label htmlFor="dash-ref-date-toolbar" className="sr-only">
              Reference date
            </label>
            <input
              id="dash-ref-date-toolbar"
              type="date"
              className={`${fieldBase} w-[min(100%,10.5rem)] min-w-[9rem] px-3 font-normal tabular-nums hover:bg-zinc-50/80 focus:bg-zinc-50 focus:ring-2 focus:ring-inset focus:ring-zinc-300/80 dark:hover:bg-zinc-900/40 dark:focus:bg-zinc-900/50 dark:focus:ring-zinc-600`}
              value={refDate}
              onChange={(e) => onRefDateChange(e.target.value)}
            />
          </div>
        )}

        {periodType === "range" && (
          <div className="flex min-w-0 shrink-0 items-center gap-1 border-l border-zinc-200 px-2 dark:border-zinc-700">
            <label htmlFor="dash-from-toolbar" className="sr-only">
              From
            </label>
            <input
              id="dash-from-toolbar"
              type="date"
              className={`${fieldBase} w-[9.25rem] min-w-0 px-1 font-normal tabular-nums`}
              value={rangeFrom}
              onChange={(e) => onRangeFromChange(e.target.value)}
            />
            <span className="shrink-0 text-xs font-medium text-zinc-400" aria-hidden>
              to
            </span>
            <label htmlFor="dash-to-toolbar" className="sr-only">
              To
            </label>
            <input
              id="dash-to-toolbar"
              type="date"
              className={`${fieldBase} w-[9.25rem] min-w-0 px-1 font-normal tabular-nums`}
              value={rangeTo}
              min={rangeFrom}
              onChange={(e) => onRangeToChange(e.target.value)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="reporting-period-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="reporting-period-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Reporting period
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{periodRangeHint}</p>
          {periodCompletionPct != null && (
            <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <span className="text-emerald-700 dark:text-emerald-400">{periodCompletionPct}%</span> of jobs in range completed
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Quick presets</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["today", "Today", chipActive.today, presetToday],
                ["week", "This week", chipActive.week, presetWeek],
                ["month", "This month", chipActive.month, presetMonth],
                ["year", "This year", chipActive.year, presetYear],
                ["all", "All time", chipActive.all, presetAllTime],
                ["range", "Custom range", chipActive.range, () => onPeriodChange("range")],
              ] as const
            ).map(([key, label, active, onClick]) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                    : "border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">
            Income, costs, vehicle mix, quote counts, and fleet stats below follow this period. &quot;Needs attention&quot; stays a
            live snapshot (not filtered by dates).
          </p>
        </div>

        <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 sm:max-w-md lg:w-72">
          <div>
            <label htmlFor="dash-period" className="mb-1 block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Granularity
            </label>
            <select
              id="dash-period"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={periodType}
              onChange={(e) => onPeriodChange(e.target.value as DashboardPeriodType)}
            >
              <option value="day">Daily</option>
              <option value="week">Weekly (Mon–Sun)</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
              <option value="overall">Overall (all time)</option>
              <option value="range">Custom date range</option>
            </select>
          </div>

          {periodType !== "overall" && periodType !== "range" && (
            <div>
              <label htmlFor="dash-ref-date" className="mb-1 block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Reference date
              </label>
              <input
                id="dash-ref-date"
                type="date"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                value={refDate}
                onChange={(e) => onRefDateChange(e.target.value)}
              />
            </div>
          )}

          {periodType === "range" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dash-from" className="mb-1 block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  From
                </label>
                <input
                  id="dash-from"
                  type="date"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  value={rangeFrom}
                  onChange={(e) => onRangeFromChange(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="dash-to" className="mb-1 block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  To
                </label>
                <input
                  id="dash-to"
                  type="date"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  value={rangeTo}
                  min={rangeFrom}
                  onChange={(e) => onRangeToChange(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
