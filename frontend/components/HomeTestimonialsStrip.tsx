import { SITE_HOME_TESTIMONIALS } from "@/lib/site";
import { API_BASE } from "@/lib/api";

type PublicReview = { id: string; quote: string; author: string; context: string };

async function fetchApproved(): Promise<PublicReview[]> {
  try {
    const res = await fetch(`${API_BASE}/reviews`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HomeTestimonialsStrip() {
  const apiRows = await fetchApproved();
  const list =
    apiRows.length > 0
      ? apiRows.map((r) => ({
          key: r.id,
          quote: r.quote,
          author: r.author,
          context: r.context,
        }))
      : SITE_HOME_TESTIMONIALS.map((t, i) => ({
          key: `fallback-${i}`,
          quote: t.quote,
          author: t.author,
          context: t.context,
        }));

  return (
    <section
      className="border-b border-zinc-200/70 bg-gradient-to-b from-white to-zinc-50/80 py-14 dark:border-white/10 dark:from-zinc-950 dark:to-zinc-950/90 md:py-16"
      aria-labelledby="home-testimonials-heading"
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700/90 dark:text-amber-500/80">Reviews</p>
          <h2 id="home-testimonials-heading" className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
            What drivers say
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Feedback from drivers who used online booking and tracking with us.
          </p>
        </div>
        <ul className="mt-10 grid gap-5 md:grid-cols-3 md:gap-6">
          {list.map((t) => (
            <li
              key={t.key}
              className="flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-black/[0.02] dark:border-zinc-800 dark:bg-zinc-900/50 dark:ring-white/5"
            >
              <span className="text-3xl leading-none text-amber-500/40 dark:text-amber-500/30" aria-hidden>
                &ldquo;
              </span>
              <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{t.quote}</blockquote>
              <footer className="mt-5 border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.author}</p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{t.context}</p>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
