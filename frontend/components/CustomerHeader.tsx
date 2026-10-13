"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { useShopCart } from "@/components/ShopCartProvider";
import { useSiteLocation } from "@/components/SiteLocationProvider";
import { SITE_NAME, SITE_PHONE, SITE_SHORT, SITE_WHATSAPP } from "@/lib/site";
import { Menu, X, ShoppingCart, Calendar, Phone, MessageSquare, ShieldCheck, MapPin } from "lucide-react";

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
    if (
      pathname.startsWith("/shop/cart") ||
      pathname.startsWith("/shop/checkout") ||
      pathname.startsWith("/shop/confirmation")
    ) {
      return false;
    }
    return pathname === "/shop" || pathname.startsWith("/shop/");
  }
  if (href === "/shop/cart") return pathname.startsWith("/shop/cart");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function CustomerHeader() {
  const pathname = usePathname();
  const pathnameValue = pathname ?? "";
  const [open, setOpen] = useState(false);
  const { itemCount } = useShopCart();
  const { location, setLocation, options } = useSiteLocation();


  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const linkClass = (href: string) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      navActive(pathnameValue, href)
        ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
        : "text-gray-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3.5">
        {/* Brand */}
        <Link href="/" className="flex min-w-0 items-baseline gap-1.5 sm:gap-2 font-bold tracking-tight text-black dark:text-white">
          <span className="truncate text-base sm:text-lg max-w-[160px] xs:max-w-[220px] sm:max-w-none">{SITE_NAME}</span>
          <span className="hidden shrink-0 text-xs font-normal text-gray-500 sm:inline dark:text-zinc-400">
            {SITE_SHORT}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
          <Link
            href="/shop/cart"
            className={`relative rounded-full px-4 py-2 text-sm font-medium transition ${
              navActive(pathnameValue, "/shop/cart")
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
            className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-500/20 dark:border-amber-400/30 dark:text-amber-300 dark:hover:bg-amber-500/20"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin
          </Link>
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Location Picker (Desktop) */}
          <span className="hidden items-center gap-1 sm:flex" title="Service area">
            <MapPin className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            <select
              id="site-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="max-w-[min(12rem,28vw)] cursor-pointer rounded-lg border border-black/10 bg-white/90 py-1.5 pl-2 pr-7 text-xs font-medium text-gray-700 shadow-sm focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500/80 dark:border-white/15 dark:bg-zinc-900/90 dark:text-zinc-200"
            >
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </span>

          <ThemeToggle />

          {/* Mobile Cart Button (Direct access without opening menu) */}
          <Link
            href="/shop/cart"
            aria-label="View shopping cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-zinc-700 transition hover:bg-black/5 md:hidden dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            <ShoppingCart className="h-4.5 w-4.5" />
            {itemCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white dark:bg-amber-500">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            ) : null}
          </Link>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-zinc-800 transition hover:bg-black/5 md:hidden dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>

    {/* Mobile Drawer Overlay and Sheet - rendered outside header so backdrop-filter does NOT trap fixed positioning */}
    {open && (
      <div className="fixed inset-0 z-[100] md:hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer Sheet */}
        <div className="fixed right-0 top-0 bottom-0 flex h-full w-[min(22rem,88vw)] max-w-full flex-col bg-white shadow-2xl transition-transform dark:bg-zinc-950">
          {/* Drawer Header */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-black/5 px-5 dark:border-white/10">
            <span className="font-bold text-base text-zinc-900 dark:text-white">{SITE_NAME}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-zinc-700 transition hover:bg-black/5 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Service Area selector */}
              <div className="rounded-2xl border border-black/5 bg-zinc-50 p-3.5 dark:border-white/10 dark:bg-zinc-900/60">
                <label htmlFor="site-location-mobile" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <MapPin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
                  Service area
                </label>
                <select
                  id="site-location-mobile"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-2 w-full cursor-pointer rounded-xl border border-black/10 bg-white py-2.5 pl-3 pr-8 text-sm font-medium text-gray-800 shadow-sm focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500/80 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              {/* Main Links */}
              <div className="space-y-1">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Menu
                </p>
                {links.map((link) => {
                  const active = navActive(pathnameValue, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-[46px] items-center rounded-xl px-4 text-sm font-semibold transition ${
                        active
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <Link
                  href="/shop/cart"
                  onClick={() => setOpen(false)}
                  className={`flex min-h-[46px] items-center justify-between rounded-xl px-4 text-sm font-semibold transition ${
                    navActive(pathnameValue, "/shop/cart")
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  }`}
                >
                  <span>Shopping cart</span>
                  {itemCount > 0 ? (
                    <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white dark:bg-amber-500">
                      {itemCount}
                    </span>
                  ) : null}
                </Link>
              </div>

              {/* Quick Tracking Utilities */}
              <div className="space-y-1 border-t border-black/5 pt-4 dark:border-white/10">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Track status
                </p>
                <Link
                  href="/booking/track"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[42px] items-center rounded-xl px-4 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Track your booking
                </Link>
                <Link
                  href="/quote/track"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[42px] items-center rounded-xl px-4 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Track your quotation
                </Link>
              </div>

              {/* Contact actions */}
              <div className="space-y-2 border-t border-black/5 pt-4 dark:border-white/10">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Need Help?
                </p>
                <a
                  href={`tel:${SITE_PHONE.replace(/\s/g, "")}`}
                  className="flex min-h-[42px] items-center gap-2.5 rounded-xl border border-black/10 px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  <Phone className="h-4 w-4 text-emerald-600" />
                  Call: {SITE_PHONE}
                </a>
                {SITE_WHATSAPP ? (
                  <a
                    href={`https://wa.me/${SITE_WHATSAPP}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[42px] items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 text-sm font-medium text-emerald-900 transition hover:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    Chat on WhatsApp
                  </a>
                ) : null}
              </div>

              {/* Admin Panel */}
              <div className="border-t border-black/5 pt-4 dark:border-white/10">
                <Link
                  href="/admin/login"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-semibold text-amber-900 transition hover:bg-amber-500/20 dark:border-amber-400/30 dark:text-amber-300"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin Panel
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
