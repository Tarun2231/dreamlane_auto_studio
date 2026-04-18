import { Suspense } from "react";
import BookingWizard from "@/components/BookingWizard";

export const metadata = {
  title: "Book a visit",
  description: "Choose a service, pick an open slot, and confirm your details.",
};

function BookingFallback() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-20">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-black/15 border-t-black dark:border-white/20 dark:border-t-white" />
      <p className="text-sm text-gray-600 dark:text-zinc-400">Loading booking…</p>
    </div>
  );
}

export default function BookingPageRoute() {
  return (
    <Suspense fallback={<BookingFallback />}>
      <BookingWizard />
    </Suspense>
  );
}
