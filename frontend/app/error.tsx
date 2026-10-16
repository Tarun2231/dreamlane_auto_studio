"use client";

import { useEffect } from "react";
import Link from "next/link";
import CustomerFooter from "@/components/CustomerFooter";
import CustomerHeader from "@/components/CustomerHeader";
import { ShopCartProvider } from "@/components/ShopCartProvider";
import { SiteLocationProvider } from "@/components/SiteLocationProvider";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client-side error
    console.error("Application error:", error);
  }, [error]);

  return (
    <ShopCartProvider>
      <SiteLocationProvider>
        <div className="flex min-h-screen flex-col">
          <CustomerHeader />
          <main className="mx-auto flex flex-1 max-w-lg flex-col justify-center px-4 py-16 text-center">
            <h1 className="text-3xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
              We encountered an unexpected issue while loading this page. You can try reloading or return home.
            </p>
            {error?.message && (
              <p className="mt-3 rounded-lg bg-black/5 p-2 font-mono text-xs text-zinc-600 dark:bg-white/5 dark:text-zinc-400">
                {error.message}
              </p>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-full bg-black px-5 py-2 text-sm text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Try again
              </button>
              <Link
                href="/"
                className="rounded-full border border-black/15 px-5 py-2 text-sm transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
              >
                Return to home
              </Link>
            </div>
          </main>
          <CustomerFooter />
        </div>
      </SiteLocationProvider>
    </ShopCartProvider>
  );
}
