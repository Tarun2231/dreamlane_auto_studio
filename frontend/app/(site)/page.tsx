import Link from "next/link";
import ServiceCard from "@/components/ServiceCard";
import HowItWorksSection from "@/components/HowItWorksSection";
import MaintenanceTipsSection from "@/components/MaintenanceTipsSection";
import TrustFeatures from "@/components/TrustFeatures";
import FaqSection from "@/components/FaqSection";
import { API_BASE } from "@/lib/api";
import { SITE_NAME, SITE_SHORT, SITE_TAGLINE } from "@/lib/site";
import { Service } from "@/lib/types";

async function getServices(): Promise<Service[]> {
  const res = await fetch(`${API_BASE}/services`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function Home() {
  const services = await getServices();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-black/5 bg-zinc-950 dark:border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1607860108855-64acf2078ed9?q=80&w=2000&auto=format&fit=crop)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/75 to-zinc-900/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="animate-fade-in-up max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400/95">{SITE_SHORT}</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-[3.25rem] lg:leading-tight">
              {SITE_NAME}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-zinc-300">{SITE_TAGLINE}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/booking" className="btn-primary min-h-[44px] px-8 py-3">
                Book now
              </Link>
              <Link
                href="/services"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/25 bg-white px-8 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-100"
              >
                Browse services
              </Link>
              <Link
                href="/quote"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 px-8 py-3 text-sm font-semibold text-white/95 transition hover:bg-white/10"
              >
                Get a custom quote
              </Link>
            </div>
          </div>
        </div>
        <div className="relative h-px w-full bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" aria-hidden />
      </section>

      <TrustFeatures />

      <HowItWorksSection />

      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-14 md:py-16">
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Featured services</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Curated packages — reserve your slot in a few steps.</p>
            </div>
            <Link
              href="/services"
              className="text-sm font-semibold text-amber-800 underline-offset-4 hover:underline dark:text-amber-400"
            >
              View all →
            </Link>
          </div>
          {services.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-600 dark:text-zinc-400">
                Services will appear here once they are published from the admin panel.
              </p>
              <Link href="/booking" className="btn-primary mt-6">
                Book an appointment
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.slice(0, 6).map((service) => (
                <ServiceCard key={service._id} service={service} />
              ))}
            </div>
          )}
        </section>

        <MaintenanceTipsSection />

        <FaqSection />

        <section className="card mt-4 overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 text-center text-white dark:from-zinc-800 dark:to-zinc-900 md:p-10">
          <h2 className="text-xl font-bold md:text-2xl">Ready when you are</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-300">Pick a time that works — we&apos;ll confirm your visit.</p>
          <Link href="/booking" className="btn-primary mt-6 bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-white dark:text-zinc-900">
            Schedule service
          </Link>
        </section>
      </main>
    </div>
  );
}
