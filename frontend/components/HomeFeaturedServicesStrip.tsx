"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ServiceCard from "@/components/ServiceCard";
import type { Service } from "@/lib/types";

/**
 * Featured services: single-row horizontal scroll + search beside “View all”, matching shop strip layout.
 */
export default function HomeFeaturedServicesStrip({ services }: { services: Service[] }) {
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

  if (services.length === 0) {
    return (
      <section className="border-b border-zinc-200/70 bg-white dark:border-white/10 dark:bg-zinc-950" aria-labelledby="home-featured-services-heading">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-14">
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700/90 dark:text-amber-500/80">Services</p>
            <h2 id="home-featured-services-heading" className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
              Featured services
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">Packages you can book online.</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Services will appear here once published in admin.</p>
            <Link href="/booking" className="btn-primary mt-6 inline-block">
              Book an appointment
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden border-b border-zinc-200/70 bg-white dark:border-white/10 dark:bg-zinc-950" aria-labelledby="home-featured-services-heading">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-sky-100/35 to-transparent dark:from-sky-500/10" />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-14">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700/90 dark:text-amber-500/80">Services</p>
            <h2 id="home-featured-services-heading" className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
              Featured services
            </h2>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Curated packages — search or scroll, then book a slot.
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:max-w-lg md:w-auto md:max-w-xl md:flex-[1_1_22rem]">
            <label htmlFor="home-featured-services-search" className="sr-only">
              Search featured services
            </label>
            <div className="flex items-center gap-1 rounded-2xl border border-zinc-200/90 bg-zinc-50/90 p-1 shadow-sm ring-1 ring-black/[0.03] dark:border-zinc-700 dark:bg-zinc-900/90 dark:ring-white/5">
              <input
                id="home-featured-services-search"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Search services…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="min-h-10 min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <Link href="/services" className="shrink-0 rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">View all</Link>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No services match your search.</p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-amber-800 underline dark:text-amber-400"
              onClick={() => setQ("")}
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="scrollbar-thin -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3 pt-0.5 [scrollbar-width:thin] md:gap-5">
            {filtered.map((service) => (
              <div key={service._id} className="w-[min(18rem,84vw)] shrink-0 snap-start">
                <ServiceCard service={service} variant="strip" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
