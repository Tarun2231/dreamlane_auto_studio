const FAQS = [
  {
    q: "How do I book a slot?",
    a: "Choose a service, pick vehicle type, select an available date and time, then enter your contact details. You’ll get a confirmation page with your booking ID.",
  },
  {
    q: "Can I check my booking later?",
    a: "Yes — open Track booking in the menu and enter your booking ID plus the same email you used when booking. After your visit, you can download your invoice (PDF) from that page or from your confirmation page; you’ll be asked to confirm your email for security.",
  },
  {
    q: "What if I need to change my appointment?",
    a: "Contact us by phone or email (see the footer). We’ll help you reschedule based on availability.",
  },
  {
    q: "Do you service all vehicle types?",
    a: "We support common body types (hatchback, sedan, SUV) listed in the booking flow. Ask us if you’re unsure.",
  },
];

export default function FaqSection() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:py-16">
      <h2 className="text-2xl font-bold tracking-tight md:text-3xl">FAQ</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Quick answers about booking with us.</p>
      <div className="mt-8 space-y-3">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-black/5 bg-white p-4 shadow-sm open:ring-1 open:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-900/40"
          >
            <summary className="cursor-pointer list-none font-semibold text-gray-900 outline-none marker:content-none dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-2">
                {item.q}
                <span className="text-amber-600 transition group-open:rotate-180 dark:text-amber-400">▼</span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
