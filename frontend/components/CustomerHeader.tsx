"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { useShopCart } from "@/components/ShopCartProvider";
import { useSiteLocation } from "@/components/SiteLocationProvider";
import { SITE_NAME, SITE_SHORT } from "@/lib/site";

const links = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/shop", label: "Products" },
  { href: "/quote", label: "Get quote" },
  { href: "/booking", label: "Booking" },
];

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/booking")
    return pathname === "/booking" || pathname.startsWith("/booking/confirmation");
  if (href === "/booking/track") return pathname.startsWith("/booking/track");
  if (href === "/quote") {
    if (pathname.startsWith("/quote/track")) return false;
    return pathname === "/quote" || pathname.startsWith("/quote/");
  }
  if (href === "/shop") {
    if (pathname.startsWith("/shop/cart") || pathname.startsWith("/shop/checkout") || pathname.startsWith("/shop/confirmation")) {
      return false;
    }
    return pathname === "/shop" || pathname.startsWith("/shop/");
  }
  if (href === "/shop/cart") return pathname.startsWith("/shop/cart");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function CustomerHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { itemCount } = useShopCart();
  const { location, setLocation, options } = useSiteLocation();

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
            href="/shop/cart"
            className={`relative rounded-full px-4 py-2 text-sm font-medium transition ${
              navActive(pathname, "/shop/cart")
                ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                : "text-gray-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
            }`}
          >
            Cart
            {itemCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white dark:bg-amber-500">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            ) : null}
          </Link>
          <Link
            href="/admin/login"
            className="ml-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-black/5 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            Admin
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <label htmlFor="site-location" className="sr-only">
            Service area
          </label>
          <span className="hidden items-center gap-1 sm:flex" title="Service area">
            <span aria-hidden className="text-sm leading-none">
              📍
            </span>
            <select
              id="site-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="max-w-[min(12rem,28vw)] cursor-pointer rounded-lg border border-black/10 bg-white/90 py-1.5 pl-2 pr-8 text-xs font-medium text-gray-700 shadow-sm focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500/80 dark:border-white/15 dark:bg-zinc-900/90 dark:text-zinc-200"
            >
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
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
          <div className="mb-3 rounded-xl border border-black/5 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/5">
            <label htmlFor="site-location-mobile" className="text-xs font-medium text-gray-600 dark:text-zinc-400">
              Service area
            </label>
            <select
              id="site-location-mobile"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1.5 w-full cursor-pointer rounded-lg border border-black/10 bg-white py-2 pl-3 pr-8 text-sm text-gray-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500/80 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.href)} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link
              href="/shop/cart"
              className={linkClass("/shop/cart")}
              onClick={() => setOpen(false)}
            >
              Cart{itemCount > 0 ? ` (${itemCount})` : ""}
            </Link>
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
