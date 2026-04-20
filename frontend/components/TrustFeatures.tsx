const items = [
  {
    title: "Precision work",
    body: "Trained technicians and clear communication from drop-off to pickup.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    title: "Premium products",
    body: "Quality detailing products and fluids matched to your vehicle and finish.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 0 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    ),
  },
  {
    title: "Simple booking",
    body: "Pick a service, vehicle type, and slot online — confirmation in your inbox.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5" />
      </svg>
    ),
  },
];

export default function TrustFeatures() {
  return (
    <section className="border-y border-zinc-200/60 bg-gradient-to-b from-white to-zinc-50/90 py-14 dark:border-white/10 dark:from-zinc-950 dark:to-zinc-950/90 md:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700/90 dark:text-amber-500/80">Why us</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
            Built for drivers who care
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            A clear experience online and in the workshop.
          </p>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-3 sm:gap-6">
          {items.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-sm ring-1 ring-black/[0.02] transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:ring-white/5"
            >
              <div className="mb-4 inline-flex rounded-xl bg-amber-500/10 p-3 text-amber-800 dark:text-amber-400">{item.icon}</div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
