import Link from "next/link";
import HomeFeaturedServicesStrip from "@/components/HomeFeaturedServicesStrip";
import HomeEnquiryCard from "@/components/HomeEnquiryCard";
import HomeProductStrip from "@/components/HomeProductStrip";
import HomeStatsStrip from "@/components/HomeStatsStrip";
import HomePromiseStrip from "@/components/HomePromiseStrip";
import RevealOnScroll from "@/components/RevealOnScroll";
import HomeTestimonialsStrip from "@/components/HomeTestimonialsStrip";
import HowItWorksSection from "@/components/HowItWorksSection";
import MaintenanceTipsSection from "@/components/MaintenanceTipsSection";
import TrustFeatures from "@/components/TrustFeatures";
import FaqSection from "@/components/FaqSection";
import { API_BASE } from "@/lib/api";
import { SITE_HOME_HERO_BADGES, SITE_NAME, SITE_SHORT, SITE_TAGLINE } from "@/lib/site";
import { Service } from "@/lib/types";

const HOME_FEATURE_PILLS = [
  { title: "Live booking updates", body: "Track service progress and status in real time." },
  { title: "Transparent pricing", body: "Clear line-by-line quote with no hidden extras." },
  { title: "Verified technicians", body: "Work handled by trained and supervised staff." },
];

const HOME_QUICK_ACTIONS = [
  { href: "/booking", label: "Book service", hint: "Pick your slot in minutes" },
  { href: "/quote", label: "Request quote", hint: "Share issue and get pricing" },
  { href: "/booking/track", label: "Track booking", hint: "Check current status quickly" },
];

const HOME_FLOW_STEPS = [
  { title: "1. Raise request", body: "Book or send enquiry with your issue and preferred timing." },
  { title: "2. Confirm & inspect", body: "Workshop confirms scope, shares estimate, and starts work." },
  { title: "3. Track & collect", body: "Follow progress online and collect once completed." },
];

type SupportStatus = "online" | "offline" | "break";

async function getServices(): Promise<Service[]> {
  try {
    const res = await fetch(`${API_BASE}/services`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getSupportStatus(): Promise<SupportStatus> {
  try {
    const res = await fetch(`${API_BASE}/site-presence`, { cache: "no-store" });
    if (!res.ok) return "online";
    const data = (await res.json()) as { supportStatus?: string };
    return data.supportStatus === "offline" || data.supportStatus === "break" ? data.supportStatus : "online";
  } catch {
    return "online";
  }
}

export default async function Home() {
  const [services, supportStatus] = await Promise.all([getServices(), getSupportStatus()]);

  return (
    <div className="bg-[var(--background)]">
      <section className="relative overflow-hidden border-b border-white/10 bg-zinc-950">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1607860108855-64acf2078ed9?q=80&w=2000&auto=format&fit=crop)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/92 via-black/78 to-zinc-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-10%,rgba(245,158,11,0.12),transparent)]" />
        <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 animate-pulse rounded-full bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 animate-pulse rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-3 py-16 sm:px-5 md:py-24 lg:py-28">
          <div className="max-w-xl animate-fade-in-up lg:max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-400/90">{SITE_SHORT}</p>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  supportStatus === "online"
                    ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : supportStatus === "break"
                      ? "border border-amber-400/35 bg-amber-500/10 text-amber-300"
                      : "border border-zinc-400/35 bg-zinc-500/15 text-zinc-300"
                }`}
              >
                <span
                  className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                    supportStatus === "online"
                      ? "animate-pulse bg-emerald-300"
                      : supportStatus === "break"
                        ? "bg-amber-300"
                        : "bg-zinc-300"
                  }`}
                />
                {supportStatus === "online"
                  ? "Live support online"
                  : supportStatus === "break"
                    ? "Support on break"
                    : "Support offline"}
              </span>
            </div>
            <h1 className="mt-3 text-[2rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-4xl md:text-5xl md:leading-[1.1]">
              {SITE_NAME}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">{SITE_TAGLINE}</p>
            {SITE_HOME_HERO_BADGES.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="Highlights">
                {SITE_HOME_HERO_BADGES.map((label) => (
                  <li
                    key={label}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-300"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className="mt-5 grid gap-2 sm:grid-cols-3">
              {HOME_FEATURE_PILLS.map((item) => (
                <li
                  key={item.title}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-200">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{item.body}</p>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-4 sm:mt-10">
              <div className="flex flex-wrap gap-3">
                <Link href="/booking" className="btn-primary min-h-[44px] px-7 py-3 text-sm font-semibold shadow-lg shadow-black/20 transition hover:-translate-y-0.5">
                  Book now
                </Link>
                <Link
                  href="/services"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 bg-white px-7 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-100"
                >
                  Browse services
                </Link>
              </div>
              <Link
                href="/quote"
                className="text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
              >
                Need something custom? <span className="text-amber-400/90 underline decoration-amber-400/40 underline-offset-4">Get a quote</span>
              </Link>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-[13px] text-zinc-500">
                <li>
                  <Link href="/booking/track" className="transition hover:text-zinc-200">
                    Track booking
                  </Link>
                </li>
                <li>
                  <Link href="/shop" className="transition hover:text-zinc-200">
                    Shop products
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="transition hover:text-zinc-200">
                    Service list
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <HomeStatsStrip />

      <HomeProductStrip />

      <HomeFeaturedServicesStrip services={services} />

      <TrustFeatures />

      <HomeTestimonialsStrip />

      <HowItWorksSection />

      <main className="mx-auto w-full max-w-7xl space-y-16 px-3 py-16 sm:px-5 md:space-y-20 md:py-20">
        <RevealOnScroll delayMs={40}>
          <section className="rounded-2xl border border-zinc-200/70 bg-white/80 p-4 shadow-sm ring-1 ring-black/[0.02] dark:border-zinc-800 dark:bg-zinc-900/50 dark:ring-white/5 sm:p-5">
            <div className="grid gap-3 md:grid-cols-3">
              {HOME_QUICK_ACTIONS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-4 py-3 transition duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:bg-white hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-950/70 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.label}</p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{item.hint}</p>
                  <span className="mt-2 inline-block text-xs font-medium text-amber-700 transition group-hover:translate-x-0.5 dark:text-amber-500">
                    Open
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </RevealOnScroll>

        <RevealOnScroll delayMs={50}>
          <section className="rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-white to-zinc-50 p-4 shadow-sm ring-1 ring-black/[0.02] dark:border-zinc-800 dark:from-zinc-900/70 dark:to-zinc-950 dark:ring-white/5 sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700/90 dark:text-amber-500/80">Service flow</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">How your service moves</h3>
              </div>
              <span className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">Simple 3-step process</span>
            </div>
            <ul className="mt-4 grid gap-3 md:grid-cols-3">
              {HOME_FLOW_STEPS.map((step) => (
                <li
                  key={step.title}
                  className="group rounded-xl border border-zinc-200/80 bg-white px-4 py-3 transition duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-zinc-600"
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{step.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </RevealOnScroll>

        <RevealOnScroll delayMs={60}>
          <MaintenanceTipsSection />
        </RevealOnScroll>

        <RevealOnScroll delayMs={80}>
          <FaqSection />
        </RevealOnScroll>

        <RevealOnScroll delayMs={100}>
          <HomePromiseStrip />
        </RevealOnScroll>

        <RevealOnScroll delayMs={120}>
          <section className="grid gap-4 lg:grid-cols-4 lg:items-stretch">
            <div className="flex h-full flex-col rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-center text-white shadow-xl shadow-zinc-900/10 dark:border-white/10 dark:from-zinc-900 dark:to-zinc-950 lg:p-7">
              <div>
                <h2 className="text-lg font-semibold tracking-tight md:text-xl">Ready when you are</h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
                  Pick a time that works. Need pricing first? Request a quote anytime.
                </p>
              </div>
              <div className="mt-6 flex flex-col items-center justify-center gap-3">
                <Link
                  href="/booking"
                  className="btn-primary inline-flex min-h-[44px] w-full justify-center bg-white px-6 text-zinc-900 shadow-md hover:bg-zinc-100 dark:bg-white dark:text-zinc-900"
                >
                  Schedule service
                </Link>
                <Link
                  href="/quote"
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
                >
                  Get a quote
                </Link>
              </div>
              <p className="mt-5 text-xs text-zinc-500">
                Already booked?{" "}
                <Link href="/booking/track" className="font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline">
                  Track your booking
                </Link>
              </p>
            </div>

            <HomeEnquiryCard className="mx-0 mt-0 h-full w-full max-w-none self-stretch lg:col-span-3" />
          </section>
        </RevealOnScroll>
      </main>
    </div>
  );
}
