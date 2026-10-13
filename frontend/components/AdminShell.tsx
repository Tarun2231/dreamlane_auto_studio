"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import AdminCommandPalette, { AdminSearchButton } from "@/components/AdminCommandPalette";
import AdminGateLoading from "@/components/AdminGateLoading";
import AdminLoginHistorySidebar from "@/components/admin/AdminLoginHistorySidebar";
import AdminThemeToggle from "@/components/AdminThemeToggle";
import { ADMIN_APP_VERSION } from "@/lib/adminMeta";

type NavItem = { href: string; label: string; icon: ReactNode };

function IconDashboard() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  );
}

function IconWrench() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655-5.653a2.548 2.548 0 0 1-.567-1.674c-.06-.474.065-.954.352-1.318L8.75 4.75c.381-.57.997-.93 1.667-.93h.857c.67 0 1.286.36 1.667.93l1.048 1.573a2.18 2.18 0 0 1 .352 1.318c-.06.474-.065.954-.352 1.318l-1.283 1.56M11.42 15.17 17.25 21" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 14.25v-6A2.25 2.25 0 0 0 18 6h-3.621a.75.75 0 0 1-.53-.22l-.878-.88a2.25 2.25 0 0 0-1.591-.659H9.75A2.25 2.25 0 0 0 7.5 6v.75m12.75 7.5v3A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25v-9A2.25 2.25 0 0 1 6 6h1.5m12.75 8.25H3.75m6.75-3v3m3-3v3"
      />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.276c.06.36.3.662.633.816.334.154.724.144 1.05-.03l1.144-.61a1.125 1.125 0 0 1 1.398.192l1.833 1.833c.39.39.463.994.192 1.398l-.61 1.144a1.125 1.125 0 0 0-.03 1.05c.154.334.456.573.816.633l1.276.213c.542.09.94.56.94 1.11v2.592c0 .55-.398 1.02-.94 1.11l-1.276.213a1.125 1.125 0 0 0-.816.633c-.154.334-.144.724.03 1.05l.61 1.144c.271.404.198 1.008-.192 1.398l-1.833 1.833a1.125 1.125 0 0 1-1.398.192l-1.144-.61a1.125 1.125 0 0 0-1.05-.03 1.125 1.125 0 0 0-.633.816l-.213 1.276c-.09.542-.56.94-1.11.94h-2.592c-.55 0-1.02-.398-1.11-.94l-.213-1.276a1.125 1.125 0 0 0-.633-.816 1.125 1.125 0 0 0-1.05.03l-1.144.61a1.125 1.125 0 0 1-1.398-.192L3.392 19.84a1.125 1.125 0 0 1-.192-1.398l.61-1.144c.174-.326.184-.716.03-1.05a1.125 1.125 0 0 0-.816-.633l-1.276-.213A1.125 1.125 0 0 1 .808 14.29v-2.592c0-.55.398-1.02.94-1.11l1.276-.213c.36-.06.662-.3.816-.633.154-.334.144-.724-.03-1.05l-.61-1.144a1.125 1.125 0 0 1 .192-1.398L5.225 4.317a1.125 1.125 0 0 1 1.398-.192l1.144.61c.326.174.716.184 1.05.03.334-.154.573-.456.633-.816l.144-.864Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a11.448 11.448 0 005.814-5.686 2.25 2.25 0 00-1.588-3.113 2.25 2.25 0 00-2.422-.655 11.5 11.5 0 01-4.714-.43L2.25 12.76z"
      />
    </svg>
  );
}

function IconShopping() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l3.97 14.99a1.125 1.125 0 0 0 1.092.805h8.308a1.125 1.125 0 0 0 1.091-.805l3.97-14.99a1.125 1.125 0 0 0-1.091-1.165H6.622M2.25 3h-.75m.75 0h15.75m-12.75 0v-.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V3M9.75 18a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm6 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
    </svg>
  );
}

function IconCar() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 0 1-3 0m12 0a1.5 1.5 0 0 1-3 0M3.75 12h16.5l-1.5-4.5H5.25L3.75 12Zm0 0-.75 3h18l-.75-3m-16.5 0v1.5a1.5 1.5 0 0 0 1.5 1.5h1.5m-3-3h12m-9 3h.008v.008H9V15Zm3 0h.008v.008H12V15Zm3 0h.008v.008H15V15Z"
      />
    </svg>
  );
}

function IconReviews() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m9 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m8.25-4.5V18a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18V7.5A2.25 2.25 0 0 1 5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v.75m-9-3h.008v.008H12V5.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  );
}

const items: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/admin/services", label: "Services", icon: <IconWrench /> },
  { href: "/admin/shop", label: "Shop products", icon: <IconShopping /> },
  { href: "/admin/shop/orders", label: "Shop orders", icon: <IconDocument /> },
  { href: "/admin/slots", label: "Slots", icon: <IconClock /> },
  { href: "/admin/bookings", label: "Bookings", icon: <IconCalendar /> },
  { href: "/admin/customers", label: "Customers", icon: <IconUsers /> },
  { href: "/admin/employees", label: "Employees", icon: <IconBriefcase /> },
  { href: "/admin/cars", label: "Cars", icon: <IconCar /> },
  { href: "/admin/quotes", label: "Quotes", icon: <IconDocument /> },
  { href: "/admin/enquiries", label: "Enquiries", icon: <IconChat /> },
  { href: "/admin/reviews", label: "Reviews", icon: <IconReviews /> },
  { href: "/admin/project-report", label: "Project report", icon: <IconDocument /> },
  { href: "/admin/settings", label: "Settings", icon: <IconSettings /> },
];

function navActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  /** `/admin/shop` must not match `/admin/shop/orders` (prefix collision). */
  if (href === "/admin/shop") return pathname === "/admin/shop" || pathname === "/admin/shop/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="mt-6 space-y-1" aria-label="Admin sections">
      {items.map((item) => {
        const active = navActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
            onClick={onNavigate}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/admin/help"
        className={clsx(
          "mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
          pathname === "/admin/help"
            ? "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        )}
        onClick={onNavigate}
      >
        <IconHelp />
        Help
      </Link>
    </nav>
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      setToken(localStorage.getItem("adminToken"));
    } catch {
      setToken(null);
    }
  }, [mounted, pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mounted || isLoginPage) return;
    let currentToken = "";
    try {
      currentToken = localStorage.getItem("adminToken") || "";
    } catch {
      currentToken = "";
    }
    if (!currentToken) {
      router.replace("/admin/login");
    }
  }, [mounted, isLoginPage, router]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const logout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
    router.replace("/admin/login");
  };

  if (!mounted) {
    return <AdminGateLoading />;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (token === undefined) {
    return <AdminGateLoading />;
  }

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 text-center dark:bg-zinc-950">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Session missing or expired.</p>
        <Link
          href="/admin/login"
          className="mt-3 inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Go to admin login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-100 dark:bg-zinc-950">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-zinc-900 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg dark:focus:bg-white dark:focus:text-zinc-900"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-zinc-200/80 bg-white/95 px-3 py-3 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 md:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <AdminSearchButton onClick={() => setCommandPaletteOpen(true)} />
          <AdminThemeToggle variant="icon" />
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-zinc-200 text-lg text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
            aria-expanded={mobileNavOpen}
            aria-controls="admin-sidebar"
            aria-label="Open navigation menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <span aria-hidden>☰</span>
          </button>
        </div>
        <span className="shrink-0 text-lg font-bold text-zinc-900 dark:text-zinc-50">Admin</span>
        <button
          type="button"
          className="min-h-11 shrink-0 px-2 text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
          onClick={logout}
        >
          Log out
        </button>
      </header>

      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="mx-auto flex min-h-0 max-w-7xl flex-col md:grid md:min-h-screen md:grid-cols-[260px_minmax(0,1fr)]">
        <aside
          id="admin-sidebar"
          className={clsx(
            "z-50 flex w-[min(280px,88vw)] shrink-0 flex-col border-zinc-200/80 bg-white shadow-xl transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-900 md:z-auto md:w-auto md:min-h-screen md:translate-x-0 md:border-r md:shadow-sm",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
            "fixed inset-y-0 left-0 md:static md:inset-auto md:translate-x-0"
          )}
        >
          <div className="flex items-start justify-between gap-2 border-b border-zinc-100 px-5 pb-4 pt-5 dark:border-zinc-800 md:border-0 md:pb-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Operations</p>
              <Link href="/admin" className="mt-1 inline-block text-xl font-bold text-zinc-900 hover:opacity-85 dark:text-zinc-50">
                Admin
              </Link>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 md:hidden"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4 pt-2 md:pt-4">
            <SidebarNav pathname={pathname ?? ""} onNavigate={() => setMobileNavOpen(false)} />
            <AdminLoginHistorySidebar />
            <div className="mt-auto space-y-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <p className="px-1 pt-2 text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                Panel v{ADMIN_APP_VERSION}
              </p>
            </div>
          </div>
        </aside>

        <main
          id="admin-main-content"
          tabIndex={-1}
          className="min-w-0 max-w-full overflow-x-auto bg-slate-100 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none dark:bg-zinc-950 md:p-8"
        >
          {children}
        </main>
      </div>

      <AdminCommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </div>
  );
}
