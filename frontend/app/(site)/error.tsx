"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CustomerSiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Site error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">This page couldn&apos;t load</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
        We encountered a temporary issue loading this page. Please try again or browse other services.
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
          href="/services"
          className="rounded-full border border-black/15 px-5 py-2 text-sm transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
        >
          Browse services
        </Link>
        <Link
          href="/"
          className="rounded-full border border-black/15 px-5 py-2 text-sm transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
