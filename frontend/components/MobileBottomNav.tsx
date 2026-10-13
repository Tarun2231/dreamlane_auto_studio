"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShopCart } from "@/components/ShopCartProvider";
import { Home, Wrench, Store, Calendar, ShoppingCart } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname() || "";
  const { itemCount } = useShopCart();

  const isHome = pathname === "/";
  const isServices = pathname === "/services" || pathname.startsWith("/services/");
  const isShop = (pathname === "/shop" || pathname.startsWith("/shop/")) && !pathname.startsWith("/shop/cart");
  const isBooking = pathname === "/booking" || pathname.startsWith("/booking/");
  const isCart = pathname.startsWith("/shop/cart");

  const navItems = [
    {
      href: "/",
      label: "Home",
      active: isHome,
      icon: Home,
    },
    {
      href: "/services",
      label: "Services",
      active: isServices,
      icon: Wrench,
    },
    {
      href: "/shop",
      label: "Shop",
      active: isShop,
      icon: Store,
    },
    {
      href: "/booking",
      label: "Book",
      active: isBooking,
      icon: Calendar,
    },
    {
      href: "/shop/cart",
      label: "Cart",
      active: isCart,
      icon: ShoppingCart,
      badge: itemCount,
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-30 md:hidden border-t border-black/10 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/95 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
                item.active
                  ? "text-amber-800 dark:text-amber-400 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${item.active ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
                {item.badge != null && item.badge > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white dark:bg-amber-500">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </div>
              <span className="mt-1 text-[11px] leading-none tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
