"use client";

import { useMemo, useState } from "react";
import ServiceCard from "@/components/ServiceCard";
import type { Service } from "@/lib/types";

export default function ServicesGrid({ services }: { services: Service[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return services;
    return services.filter(
      (svc) =>
        svc.name.toLowerCase().includes(s) ||
        svc.description.toLowerCase().includes(s)
    );
  }, [services, q]);

  return (
    <div>
      <div className="mb-8">
        <label htmlFor="svc-search" className="sr-only">
          Search services
        </label>
        <input
          id="svc-search"
          type="search"
          placeholder="Search by name or description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-md rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none ring-amber-500/30 placeholder:text-gray-400 focus:border-amber-500/50 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-800 dark:placeholder:text-zinc-500"
        />
        {q.trim() && (
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
            {filtered.length} match{filtered.length === 1 ? "" : "es"}
          </p>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-600 dark:text-zinc-400">No services match your search.</p>
          <button type="button" className="mt-4 text-sm font-semibold text-amber-800 underline dark:text-amber-400" onClick={() => setQ("")}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => (
            <ServiceCard key={service._id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
