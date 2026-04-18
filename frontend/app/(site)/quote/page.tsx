import Link from "next/link";
import QuoteRequestForm from "@/components/QuoteRequestForm";

export const metadata = {
  title: "Request a quotation",
  description: "Describe the work and parts you need — we will send you a quotation before you book.",
};

export default function QuotePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <nav className="mb-6 text-sm text-gray-500 dark:text-zinc-500">
        <Link href="/" className="font-medium text-amber-800 hover:underline dark:text-amber-400">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-zinc-200">Quotation</span>
      </nav>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-500">Custom work</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Request a quotation</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
          Choose your vehicle (same dropdowns as booking), pick a <strong>service package</strong> from our workshop list or
          &quot;Custom work&quot;, add any parts notes, and submit. We&apos;ll review and email you a quotation — then you can
          accept it and book a slot. <strong>Get quote</strong> stays available in the site menu.
        </p>
      </div>
      <QuoteRequestForm />
    </main>
  );
}
