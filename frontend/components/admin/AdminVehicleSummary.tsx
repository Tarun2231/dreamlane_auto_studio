import type { QuoteRequest } from "@/lib/types";

export type VehicleFields = Pick<QuoteRequest, "vehicleType" | "carMake" | "carModel" | "vehicleYear" | "vehicleHint">;

export function vehicleLine(v: VehicleFields): string {
  if (v.carMake && v.carModel) {
    const bits = [v.vehicleType, v.carMake, v.carModel].filter(Boolean);
    return `${bits.join(" · ")}${v.vehicleYear != null ? ` (${v.vehicleYear})` : ""}`;
  }
  return v.vehicleHint || "";
}

type Props = {
  vehicle: VehicleFields;
  /** Larger padding and title for detail panes */
  variant?: "compact" | "featured";
  className?: string;
};

export default function AdminVehicleSummary({ vehicle, variant = "compact", className = "" }: Props) {
  const line = vehicleLine(vehicle);
  const hasStructured = Boolean(vehicle.carMake && vehicle.carModel);

  if (!hasStructured && !vehicle.vehicleHint) {
    return null;
  }

  if (!hasStructured) {
    return (
      <div
        className={`rounded-xl border border-zinc-200/80 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/50 ${className}`}
      >
        <p className="px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200">{vehicle.vehicleHint}</p>
      </div>
    );
  }

  const pad = variant === "featured" ? "p-4 sm:p-5" : "p-3 sm:p-4";
  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 shadow-sm dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950/80 ${pad} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500">Vehicle</p>
          <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{line}</p>
        </div>
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
          aria-hidden
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 18.75a1.5 1.5 0 0 1-3 0m12 0a1.5 1.5 0 0 1-3 0M3.75 12h16.5l-1.5-4.5H5.25L3.75 12Zm0 0-.75 3h18l-.75-3m-16.5 0v1.5a1.5 1.5 0 0 0 1.5 1.5h1.5m-3-3h12m-9 3h.008v.008H9V15Zm3 0h.008v.008H12V15Zm3 0h.008v.008H15V15Z"
            />
          </svg>
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Body</dt>
          <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">{vehicle.vehicleType || "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Make</dt>
          <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">{vehicle.carMake || "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Model</dt>
          <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">{vehicle.carModel || "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Year</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
            {vehicle.vehicleYear != null ? vehicle.vehicleYear : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
