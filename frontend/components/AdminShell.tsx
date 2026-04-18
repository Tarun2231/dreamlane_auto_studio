"use client";

/* eslint-disable react-hooks/set-state-in-effect -- client-only mount + token sync from localStorage */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminGateLoading from "@/components/AdminGateLoading";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/slots", label: "Slots" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/customers", label: "Customers" },
];

function navActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setToken(localStorage.getItem("adminToken"));
  }, [mounted, pathname]);

  useEffect(() => {
    if (!mounted || isLoginPage) return;
    if (!localStorage.getItem("adminToken")) {
      router.replace("/admin/login");
    }
  }, [mounted, isLoginPage, router]);

  const logout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
    router.replace("/admin/login");
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!mounted) {
    return <AdminGateLoading />;
  }

  if (!token) {
    return <AdminGateLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside className="border-r border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Operations</p>
          <h2 className="mt-1 text-xl font-bold">Admin</h2>
          <nav className="mt-6 space-y-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                  navActive(item.href, pathname) ? "bg-black text-white" : "text-gray-700 hover:bg-black/5"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 space-y-2 border-t border-black/10 pt-6">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              View live site →
            </Link>
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Log out
            </button>
          </div>
        </aside>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
