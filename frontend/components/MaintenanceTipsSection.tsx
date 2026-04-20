const TIPS = [
  {
    title: "Oil & filters",
    body: "Follow your manufacturer interval; city driving and short trips often mean sooner changes.",
  },
  {
    title: "Tires & alignment",
    body: "Check pressure monthly; uneven wear usually means alignment or suspension checks.",
  },
  {
    title: "Brakes & battery",
    body: "Squeaks or longer stops need attention; batteries weaken faster in extreme heat or cold.",
  },
];

export default function MaintenanceTipsSection() {
  return (
    <section className="w-full">
      <div className="mb-8 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700/90 dark:text-amber-500/80">For your vehicle</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">Maintenance basics</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          General guidance — your technician will confirm what your car needs at the visit.
        </p>
      </div>
      <ul className="grid gap-5 md:grid-cols-3 md:gap-6">
        {TIPS.map((t) => (
          <li
            key={t.title}
            className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-black/[0.02] dark:border-zinc-800 dark:bg-zinc-900/50 dark:ring-white/5"
          >
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{t.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
