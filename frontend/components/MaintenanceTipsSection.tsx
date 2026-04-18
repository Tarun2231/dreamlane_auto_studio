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
    <section className="mx-auto max-w-6xl px-4 py-12 md:py-14">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-400">For your vehicle</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Maintenance basics</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
          General guidance — your technician will confirm what your car needs at the visit.
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {TIPS.map((t) => (
          <li key={t.title} className="card border border-black/5 p-5 dark:border-white/10">
            <h3 className="font-semibold text-gray-900 dark:text-zinc-100">{t.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{t.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
