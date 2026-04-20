"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ConfirmationInner() {
  const search = useSearchParams();
  const order = search.get("order") || "";

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Order placed</p>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Thank you</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        We received your product order{order ? (
          <>
            {" "}
            <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{order}</span>
          </>
        ) : null}
        . We&apos;ll contact you to confirm payment and next steps.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/shop" className="btn-primary min-h-11 px-6 py-3 text-sm font-semibold">
          Continue shopping
        </Link>
        <Link href="/" className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-medium dark:border-zinc-600">
          Home
        </Link>
      </div>
    </main>
  );
}

export default function ShopConfirmationPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-lg px-4 py-16 text-center text-zinc-500">Loading…</main>}>
      <ConfirmationInner />
    </Suspense>
  );
}
