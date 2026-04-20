"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSiteLocation } from "@/components/SiteLocationProvider";

export default function HomeVisitLocationCard() {
  const { location } = useSiteLocation();
  const mapsHref = useMemo(
    () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`,
    [location]
  );

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-6 shadow-sm ring-1 ring-black/[0.02] dark:border-zinc-800 dark:bg-zinc-900/40 dark:ring-white/5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Location</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">{location}</p>
      <Link
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex text-sm font-medium text-amber-700 underline-offset-4 hover:underline dark:text-amber-500"
      >
        Get directions
      </Link>
    </div>
  );
}
