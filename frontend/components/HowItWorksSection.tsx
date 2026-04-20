const steps = [
  {
    title: "Pick a package",
    body: "Browse services and pricing, then start booking with one tap.",
  },
  {
    title: "Choose a time",
    body: "See real openings on the calendar and lock the slot that fits you.",
  },
  {
    title: "Arrive & relax",
    body: "Get a confirmation link. Track status anytime with your email.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="border-y border-zinc-200/60 bg-zinc-50/70 py-14 dark:border-white/10 dark:bg-zinc-900/35 md:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700/90 dark:text-amber-500/80">How it works</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">Book in three steps</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">No phone tag — pick, schedule, and go.</p>
        </div>
        <ol className="mt-10 grid gap-6 md:grid-cols-3 md:gap-5">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="relative rounded-2xl border border-zinc-200/80 bg-white p-6 text-left shadow-sm ring-1 ring-black/[0.02] dark:border-zinc-800 dark:bg-zinc-900/50 dark:ring-white/5"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-white dark:text-zinc-900"
                aria-hidden
              >
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
