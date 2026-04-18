"use client";

import { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/api";
import type { CustomerDirectoryEntry } from "@/lib/types";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "our garage";

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

function defaultOfferEmail(name: string) {
  return `Hello ${name},\n\nThis is ${SITE}. We wanted to share a current offer with you.\n\n[Describe your promotion here]\n\nBook online or reply to this email.\n\nBest regards,\n${SITE}`;
}

function defaultOfferWhatsApp(name: string) {
  return `Hi ${name}, this is ${SITE}. We have a special offer for you — reply here to book or ask for details. Thank you!`;
}

function reminderWhatsApp(c: CustomerDirectoryEntry) {
  if (!c.nextServiceDueDate || !c.reminderAnchor) {
    return defaultOfferWhatsApp(c.customerName);
  }
  return (
    `Hi ${c.customerName}, this is ${SITE}. ` +
    `Your next service is recommended by ${c.nextServiceDueDate} ` +
    `(based on your ${c.reminderAnchor.serviceName} on ${c.reminderAnchor.servicedOn}). ` +
    `Reply here to schedule. Thank you!`
  );
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerDirectoryEntry[]>([]);
  const [today, setToday] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [phone, setPhone] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [emailOpen, setEmailOpen] = useState<CustomerDirectoryEntry | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await adminApi.get<{ customers: CustomerDirectoryEntry[]; today: string }>("/customers", {
        params: {
          q: q.trim() || undefined,
          phone: phone.trim() || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      setCustomers(res.data.customers);
      setToday(res.data.today);
    } catch {
      setErr("Could not load customers. Check that you are logged in and the API is running.");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only; filters use "Apply filters"
  }, []);

  const openEmail = (c: CustomerDirectoryEntry) => {
    setEmailOpen(c);
    setEmailSubject(`${SITE} — special offer`);
    setEmailBody(defaultOfferEmail(c.customerName));
    setEmailMsg(null);
  };

  const sendEmail = async () => {
    if (!emailOpen) return;
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      await adminApi.post("/customers/send-email", {
        to: emailOpen.email,
        subject: emailSubject.trim(),
        text: emailBody,
      });
      setEmailMsg("Email sent.");
      setTimeout(() => {
        setEmailOpen(null);
        setEmailMsg(null);
      }, 1200);
    } catch (e: unknown) {
      const msg = e as { response?: { data?: { message?: string } } };
      setEmailMsg(msg?.response?.data?.message || "Send failed. Is SMTP configured?");
    } finally {
      setEmailBusy(false);
    }
  };

  const stats = useMemo(() => {
    const due = customers.filter((c) => c.reminderDueToday).length;
    const overdue = customers.filter((c) => c.reminderOverdue && c.nextServiceDueDate).length;
    return { due, overdue };
  }, [customers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Everyone who has completed at least one service with you, grouped by email. Filter by name, email, phone, or last
          service date. Use WhatsApp or email for offers; automated next-service reminders are sent by the server when
          enabled (see backend <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">.env</code>) and when a service
          has <strong>follow-up months</strong> set under Services.
        </p>
        {today && (
          <p className="mt-2 text-xs text-zinc-500">
            Server &quot;today&quot; for reminders: <span className="font-mono">{today}</span>
            {stats.due > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
                {stats.due} due today
              </span>
            )}
            {stats.overdue > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-900 dark:bg-red-950/40 dark:text-red-200">
                {stats.overdue} overdue
              </span>
            )}
          </p>
        )}
      </div>

      <div className="card flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-end">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Search name or email</label>
          <input
            className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. tarun or @gmail"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Phone contains</label>
          <input
            className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="digits"
          />
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Last service from</label>
          <input
            type="date"
            className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Last service to</label>
          <input
            type="date"
            className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900"
          onClick={() => void load()}
        >
          Apply filters
        </button>
      </div>

      {err && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : customers.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No customers match (completed bookings only).</p>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => {
            const wa = digitsOnly(c.phone);
            const open = expanded === c.emailNorm;
            return (
              <div key={c.emailNorm} className="card overflow-hidden border border-zinc-200/80 dark:border-zinc-700/80">
                <div className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{c.customerName}</p>
                      {c.reminderDueToday && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
                          Reminder due today
                        </span>
                      )}
                      {c.reminderOverdue && c.nextServiceDueDate && !c.reminderDueToday && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-900 dark:bg-red-950/40 dark:text-red-200">
                          Reminder overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm">
                      <a href={`mailto:${c.email}`} className="font-medium text-amber-800 underline dark:text-amber-400">
                        {c.email}
                      </a>
                      <span className="text-zinc-400"> · </span>
                      <a href={`tel:${digitsOnly(c.phone)}`} className="font-medium text-amber-800 underline dark:text-amber-400">
                        {c.phone}
                      </a>
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Last completed visit: <span className="font-medium">{c.lastServiceDate}</span> · {c.bookings.length}{" "}
                      completed job(s)
                    </p>
                    {c.nextServiceDueDate && c.reminderAnchor && (
                      <p className="text-xs text-zinc-700 dark:text-zinc-300">
                        Next suggested service: <span className="font-semibold">{c.nextServiceDueDate}</span> (after{" "}
                        {c.reminderAnchor.serviceName} on {c.reminderAnchor.servicedOn})
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {wa ? (
                      <a
                        href={`https://wa.me/${wa}?text=${encodeURIComponent(reminderWhatsApp(c))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        WhatsApp
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-400">No WhatsApp (phone)</span>
                    )}
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      onClick={() => openEmail(c)}
                    >
                      Email offer
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium dark:border-zinc-600"
                      onClick={() => setExpanded(open ? null : c.emailNorm)}
                    >
                      {open ? "Hide history" : "Service history"}
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="border-t border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">Completed services</p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-600">
                            <th className="py-2 pr-2">Date</th>
                            <th className="py-2 pr-2">Service</th>
                            <th className="py-2 pr-2">Vehicle</th>
                            <th className="py-2 pr-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.bookings.map((b) => (
                            <tr key={b._id} className="border-b border-zinc-100 dark:border-zinc-800">
                              <td className="py-2 pr-2 font-mono text-xs">
                                {b.date} {b.time}
                              </td>
                              <td className="py-2 pr-2">{b.service?.name ?? "—"}</td>
                              <td className="py-2 pr-2">
                                {b.vehicleType} · {b.carModel}
                              </td>
                              <td className="py-2 pr-2">{b.finalAmount != null ? `₹${b.finalAmount}` : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {emailOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="text-lg font-bold">Send email to {emailOpen.customerName}</h2>
            <p className="mt-1 text-xs text-zinc-500">{emailOpen.email}</p>
            <label className="mt-4 block text-sm font-medium">Subject</label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-800"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
            <label className="mt-3 block text-sm font-medium">Message</label>
            <textarea
              className="mt-1 min-h-[180px] w-full rounded-lg border border-zinc-300 p-2 font-sans text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
            />
            {emailMsg && <p className="mt-2 text-sm text-green-700 dark:text-green-400">{emailMsg}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                disabled={emailBusy}
                onClick={() => void sendEmail()}
              >
                {emailBusy ? "Sending…" : "Send"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
                onClick={() => setEmailOpen(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
