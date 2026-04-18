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
    <section className="border-y border-black/5 bg-zinc-50/80 py-14 dark:border-white/10 dark:bg-zinc-900/40 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-400">How it works</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Book in three steps</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">No phone tag — pick, schedule, and go.</p>
        </div>
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
          {steps.map((s, i) => (
            <li key={s.title} className="relative card p-6 text-left">
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
