"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { SITE_LOCATION, SITE_NAME, SITE_SHORT } from "@/lib/site";

const links = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/quote", label: "Get quote" },
  { href: "/booking", label: "Booking" },
  { href: "/booking/track", label: "Track" },
];

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/booking")
    return pathname === "/booking" || pathname.startsWith("/booking/confirmation");
  if (href === "/booking/track") return pathname.startsWith("/booking/track");
  if (href === "/quote") return pathname === "/quote" || pathname.startsWith("/quote/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function CustomerHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (href: string) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      navActive(pathname, href)
        ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
        : "text-gray-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
    }`;

  return (
    <header className="customer-header shadow-sm shadow-black/5 dark:shadow-black/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 md:py-4">
        <Link
          href="/"
          className="group flex min-w-0 max-w-[min(100%,14rem)] flex-col leading-tight sm:max-w-none"
          onClick={() => setOpen(false)}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-400">
            {SITE_SHORT}
          </span>
          <span className="truncate text-lg font-bold tracking-tight">{SITE_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
          <Link
            href="/admin/login"
            className="ml-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-black/5 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            Admin
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-gray-500 sm:inline dark:text-zinc-500" title="Service area">
            📍 {SITE_LOCATION}
          </span>
          <ThemeToggle />
          <button
            type="button"
            className="rounded-full border border-black/10 px-3 py-1.5 text-sm md:hidden dark:border-white/15"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-black/5 px-4 py-3 md:hidden dark:border-white/10">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.href)} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link
              href="/admin/login"
              className="rounded-xl px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300"
              onClick={() => setOpen(false)}
            >
              Admin
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
