import Link from "next/link";
import { SITE_EMAIL, SITE_HOURS, SITE_LOCATION, SITE_NAME, SITE_PHONE, SITE_WHATSAPP } from "@/lib/site";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/quote", label: "Get quote" },
  { href: "/booking", label: "Booking" },
  { href: "/booking/track", label: "Track booking" },
];

export default function CustomerFooter() {
  return (
    <footer className="customer-footer mt-auto border-t border-black/10 py-12 dark:border-white/10">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-3">
        <div>
          <p className="font-bold">{SITE_NAME}</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Premium car care &amp; online booking.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Contact</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
            <a href={`tel:${SITE_PHONE.replace(/\s/g, "")}`} className="hover:underline">
              {SITE_PHONE}
            </a>
          </p>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            <a href={`mailto:${SITE_EMAIL}`} className="hover:underline">
              {SITE_EMAIL}
            </a>
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">{SITE_LOCATION}</p>
          {SITE_WHATSAPP ? (
            <p className="mt-2 text-sm">
              <a
                href={`https://wa.me/${SITE_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:underline dark:text-zinc-300"
              >
                WhatsApp
              </a>
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Hours</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-zinc-400">
            {SITE_HOURS.map((h) => (
              <li key={h.label}>
                {h.label}: {h.value}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-black/5 px-4 pt-8 dark:border-white/10">
        <nav className="flex flex-wrap gap-4 text-sm">
          {footerLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-gray-700 underline-offset-4 hover:underline dark:text-zinc-300">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-gray-500 dark:text-zinc-500">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
