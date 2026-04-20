import HomeVisitLocationCard from "@/components/HomeVisitLocationCard";
import { SITE_EMAIL, SITE_HOURS, SITE_PHONE, SITE_WHATSAPP } from "@/lib/site";

export default function HomeVisitStrip() {
  return (
    <section className="border-b border-zinc-200/60 bg-white py-14 dark:border-white/10 dark:bg-zinc-950 md:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700/90 dark:text-amber-500/80">Visit & contact</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">We&apos;re easy to reach</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">Call, email, or drop by during workshop hours.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
          <HomeVisitLocationCard />

          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-6 shadow-sm ring-1 ring-black/[0.02] dark:border-zinc-800 dark:bg-zinc-900/40 dark:ring-white/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Hours</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {SITE_HOURS.map((h) => (
                <li key={h.label} className="flex justify-between gap-4">
                  <span className="text-zinc-500 dark:text-zinc-400">{h.label}</span>
                  <span className="font-medium">{h.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-6 shadow-sm ring-1 ring-black/[0.02] dark:border-zinc-800 dark:bg-zinc-900/40 dark:ring-white/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Talk to us</p>
            <p className="mt-3">
              <a href={`tel:${SITE_PHONE.replace(/\s/g, "")}`} className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100">
                {SITE_PHONE}
              </a>
            </p>
            <p className="mt-2">
              <a href={`mailto:${SITE_EMAIL}`} className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
                {SITE_EMAIL}
              </a>
            </p>
            {SITE_WHATSAPP ? (
              <p className="mt-3">
                <a
                  href={`https://wa.me/${SITE_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-500"
                >
                  Message on WhatsApp
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
