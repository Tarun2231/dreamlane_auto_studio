"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { QuoteRequest, Service } from "@/lib/types";

function quoteServiceTitle(q: QuoteRequest): string {
  if (q.serviceNameSnapshot) return q.serviceNameSnapshot;
  const sid = q.serviceId;
  if (sid && typeof sid === "object" && "name" in sid) return (sid as Service).name;
  return "";
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function QuoteTrackPage() {
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [respondLoading, setRespondLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lookup = async () => {
    setErr(null);
    setQuote(null);
    setLoading(true);
    try {
      const res = await api.post<QuoteRequest>("/quote-request/lookup", { id: id.trim(), email: email.trim() });
      setQuote(res.data);
    } catch {
      setErr("No quote matches that ID and email. Check your confirmation or email.");
    } finally {
      setLoading(false);
    }
  };

  const respond = async (action: "accept" | "decline") => {
    if (!quote) return;
    setRespondLoading(true);
    setErr(null);
    try {
      const res = await api.post<QuoteRequest>("/quote-request/respond", {
        id: quote._id,
        email: email.trim(),
        action,
      });
      setErr(null);
      setQuote(res.data);
    } catch (e: unknown) {
      const er = e as { response?: { data?: { message?: string } } };
      setErr(er?.response?.data?.message || "Could not update.");
    } finally {
      setRespondLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <nav className="mb-6 text-sm text-gray-500 dark:text-zinc-500">
        <Link href="/" className="font-medium text-amber-800 hover:underline dark:text-amber-400">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/quote" className="font-medium text-amber-800 hover:underline dark:text-amber-400">
          Quotation
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-zinc-200">Track</span>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Track your quote</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
        Enter the request ID from your confirmation and the email you used.
      </p>

      <form
        className="card mt-8 space-y-4 p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Request ID</span>
          <input
            className="w-full rounded-xl border border-gray-300 bg-white p-3 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-800"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Paste your reference ID"
            autoComplete="off"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Email</span>
          <input
            className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        {err && !quote && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {err}
          </p>
        )}
        <button type="submit" className="btn-primary min-h-11 w-full sm:w-auto" disabled={loading}>
          {loading ? "Looking up…" : "View quote"}
        </button>
      </form>

      {quote && (
        <div className="card mt-6 space-y-4 p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Your request</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-zinc-500">Status</dt>
              <dd className="font-medium">{quote.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-zinc-500">Name</dt>
              <dd>{quote.customerName}</dd>
            </div>
            {(quote.carMake || quote.vehicleHint) && (
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                <dt className="shrink-0 text-gray-500 dark:text-zinc-500">Vehicle</dt>
                <dd className="text-right sm:max-w-[70%]">
                  {quote.carMake ? (
                    <>
                      <span className="font-medium text-gray-900 dark:text-zinc-100">
                        {[quote.carMake, quote.carModel].filter(Boolean).join(" ")}
                        {quote.vehicleYear != null ? ` · ${quote.vehicleYear}` : ""}
                      </span>
                      {quote.vehicleType ? (
                        <span className="mt-0.5 block text-xs text-gray-500 dark:text-zinc-500">{quote.vehicleType}</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-gray-900 dark:text-zinc-100">{quote.vehicleHint}</span>
                  )}
                </dd>
              </div>
            )}
            <div className="border-t border-black/5 pt-3 dark:border-white/10">
              <dt className="text-gray-500 dark:text-zinc-500">Service</dt>
              <dd className="mt-1 text-gray-900 dark:text-zinc-100">
                {quoteServiceTitle(quote) ? (
                  <p className="font-medium">{quoteServiceTitle(quote)}</p>
                ) : null}
                {quote.serviceDescription ? (
                  <p
                    className={`whitespace-pre-wrap ${quoteServiceTitle(quote) ? "mt-1 text-sm text-gray-700 dark:text-zinc-300" : ""}`}
                  >
                    {quote.serviceDescription}
                  </p>
                ) : !quoteServiceTitle(quote) ? (
                  <span className="text-gray-500">—</span>
                ) : null}
              </dd>
            </div>
            {quote.partsNotes ? (
              <div>
                <dt className="text-gray-500 dark:text-zinc-500">Parts noted</dt>
                <dd className="mt-1 whitespace-pre-wrap text-gray-900 dark:text-zinc-100">{quote.partsNotes}</dd>
              </div>
            ) : null}
            {quote.status === "Quoted" || quote.status === "Accepted" || quote.status === "Declined" ? (
              <div className="border-t border-black/5 pt-3 dark:border-white/10">
                <dt className="text-gray-500 dark:text-zinc-500">Quotation</dt>
                <dd className="mt-1">
                  {quote.quotedAmount != null && quote.quotedAmount > 0 ? (
                    <span className="text-lg font-semibold tabular-nums text-gray-900 dark:text-zinc-100">
                      {formatInr(quote.quotedAmount)}
                    </span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                  {quote.quoteNotes ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-zinc-300">{quote.quoteNotes}</p>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>

          {quote.status === "Quoted" && (
            <div className="flex flex-wrap gap-3 border-t border-black/5 pt-4 dark:border-white/10">
              <button
                type="button"
                className="btn-primary min-h-11 px-5 disabled:opacity-50"
                disabled={respondLoading}
                onClick={() => void respond("accept")}
              >
                {respondLoading ? "Saving…" : "Accept quotation"}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-full border border-zinc-300 px-5 text-sm font-medium dark:border-zinc-600"
                disabled={respondLoading}
                onClick={() => void respond("decline")}
              >
                Decline
              </button>
            </div>
          )}

          {quote.status === "Accepted" && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
              You accepted this quotation.{" "}
              <Link href="/booking" className="font-semibold underline">
                Book a service slot
              </Link>{" "}
              or wait for us to contact you.
            </p>
          )}

          {err && quote && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {err}
            </p>
          )}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-gray-600 dark:text-zinc-500">
        <Link href="/quote" className="font-medium text-amber-800 underline dark:text-amber-400">
          New quotation request
        </Link>
      </p>
    </main>
  );
}
