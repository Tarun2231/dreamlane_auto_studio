import Link from "next/link";

export const metadata = {
  title: "Quote request sent",
};

export default async function QuoteConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ emailIssue?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const emailIssue = sp.emailIssue === "1";
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col px-4 py-16">
      <div className="card space-y-5 p-6 text-center md:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Received</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">We got your quotation request</h1>
        {emailIssue ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            We could not send a confirmation email (check SMTP on the server). Your request is still saved — use the reference
            below on Track quote.
          </p>
        ) : null}
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          Reference ID — keep this to track your quote:
        </p>
        <p className="break-all font-mono text-sm text-gray-900 dark:text-zinc-100">{id}</p>
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          {emailIssue
            ? "When email is fixed, new requests will receive a confirmation automatically."
            : "You should receive a confirmation email shortly (check spam). We'll send a formal quotation when we've reviewed your request."}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href={`/quote/track`} className="btn-primary min-h-11 px-6">
            Track this quote
          </Link>
          <Link
            href="/booking"
            className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium dark:border-white/20"
          >
            Book a standard service
          </Link>
        </div>
      </div>
    </main>
  );
}
