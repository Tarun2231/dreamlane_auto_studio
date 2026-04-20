"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

/** Must match backend `CUSTOM_SERVICE_ID` and `QuoteRequestForm`. */
const QUOTE_CUSTOM_SERVICE = "__custom__";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

/**
 * Compact enquiry for the homepage — stored as a custom quote request so the workshop sees it in Admin → Quotes,
 * with optional topic / urgency / preferred contact for routing and the conversation thread.
 */
type HomeEnquiryCardProps = {
  className?: string;
};

export default function HomeEnquiryCard({ className = "" }: HomeEnquiryCardProps) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [enquiryTopic, setEnquiryTopic] = useState("");
  const [preferredContact, setPreferredContact] = useState<"email" | "phone" | "either">("either");
  const [urgency, setUrgency] = useState<"routine" | "soon" | "urgent">("routine");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const y = new Date().getFullYear();
    setLoading(true);
    try {
      const res = await api.post<{
        _id: string;
        emailSent?: { customer?: boolean; workshop?: boolean };
      }>("/quote-request", {
        requestKind: "enquiry",
        customerName: customerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        vehicleType: "Sedan",
        carMake: "General",
        carModel: "Homepage enquiry",
        vehicleYear: y,
        serviceId: QUOTE_CUSTOM_SERVICE,
        serviceDescription: message.trim(),
        partsNotes: "",
        enquiryTopic: enquiryTopic.trim() || undefined,
        preferredContact,
        urgency,
      });
      const data = res.data;
      const emailIssue = data.emailSent && data.emailSent.customer === false ? "?emailIssue=1" : "";
      router.push(`/quote/confirmation/${data._id}${emailIssue}`);
    } catch (ex: unknown) {
      const ax = ex as { response?: { data?: { message?: string } } };
      setErr(ax?.response?.data?.message ?? "Could not send — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`group relative w-full max-w-4xl overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.05] via-white to-zinc-50 p-5 shadow-sm transition hover:shadow-md dark:border-amber-500/15 dark:from-amber-500/[0.08] dark:via-zinc-900 dark:to-zinc-950 sm:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl transition group-hover:scale-110 dark:bg-amber-500/15" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Send an enquiry</h3>
        <Link
          href="/quote/track"
          className="inline-flex min-h-[36px] items-center rounded-full border border-zinc-300/90 bg-white px-3.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
        >
          Track enquiry
        </Link>
      </div>
      <p className="relative mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        Tell us what you need. We&apos;ll reply in the thread and by your preferred channel. For a full quote with vehicle
        lists, use{" "}
        <Link href="/quote" className="font-medium text-amber-800 underline underline-offset-2 dark:text-amber-400">
          Get quote
        </Link>
        .
      </p>
      <form onSubmit={(e) => void submit(e)} className="relative mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="enquiry-name" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Full name
            </label>
            <input
              id="enquiry-name"
              className={inputClass}
              placeholder="Your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="name"
              required
              minLength={2}
            />
          </div>
          <div>
            <label htmlFor="enquiry-phone" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Phone
            </label>
            <input
              id="enquiry-phone"
              type="tel"
              className={inputClass}
              placeholder="Mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
              minLength={5}
            />
          </div>
        </div>
        <div>
          <label htmlFor="enquiry-email" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            id="enquiry-email"
            type="email"
            className={inputClass}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label htmlFor="enquiry-message" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Your enquiry
          </label>
          <textarea
            id="enquiry-message"
            className="min-h-[88px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="Describe what you need in a few lines."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={10}
            maxLength={4000}
          />
        </div>
        <details className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
          <summary className="cursor-pointer select-none text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Add optional details (topic, urgency, reply preference)
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="enquiry-topic" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Topic <span className="font-normal text-zinc-500">(optional)</span>
              </label>
              <input
                id="enquiry-topic"
                className={inputClass}
                placeholder="e.g. Brake noise, annual service"
                value={enquiryTopic}
                onChange={(e) => setEnquiryTopic(e.target.value)}
                maxLength={160}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="enquiry-urgency" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Urgency
                </label>
                <select
                  id="enquiry-urgency"
                  className={inputClass}
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as "routine" | "soon" | "urgent")}
                >
                  <option value="routine">Routine — planning ahead</option>
                  <option value="soon">Soon — this week</option>
                  <option value="urgent">Urgent — ASAP</option>
                </select>
              </div>
              <div>
                <label htmlFor="enquiry-reply" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Prefer replies via
                </label>
                <select
                  id="enquiry-reply"
                  className={inputClass}
                  value={preferredContact}
                  onChange={(e) => setPreferredContact(e.target.value as "email" | "phone" | "either")}
                >
                  <option value="either">Email or phone</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone / WhatsApp</option>
                </select>
              </div>
            </div>
          </div>
        </details>
        {err ? <p className="text-sm text-rose-600 dark:text-rose-400">{err}</p> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Fast reply during business hours.</div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {loading ? "Sending..." : "Send enquiry"}
          </button>
        </div>
      </form>
    </div>
  );
}
