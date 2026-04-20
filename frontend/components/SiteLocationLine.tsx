"use client";

import { useSiteLocation } from "@/components/SiteLocationProvider";

/** Footer line — reflects the visitor’s selected service area */
export default function SiteLocationLine() {
  const { location } = useSiteLocation();
  return <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">{location}</p>;
}
