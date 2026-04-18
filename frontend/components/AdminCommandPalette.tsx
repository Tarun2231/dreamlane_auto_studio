"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const OPEN_EVENT = "admin:open-command-palette";

export function requestOpenAdminCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Cmd = { id: string; label: string; href: string; hint?: string; keywords?: string };

function buildCommands(todayYmd: string): Cmd[] {
  const q = `dateFrom=${encodeURIComponent(todayYmd)}&dateTo=${encodeURIComponent(todayYmd)}`;
  return [
    { id: "dash", label: "Dashboard", href: "/admin", keywords: "home kpi stats" },
    { id: "services", label: "Services", href: "/admin/services", keywords: "packages pricing" },
    { id: "slots", label: "Slots", href: "/admin/slots", keywords: "availability calendar times" },
    { id: "bookings", label: "Bookings", href: "/admin/bookings", keywords: "jobs orders" },
    { id: "bookings-today", label: "Today's bookings", href: `/admin/bookings?${q}`, keywords: "today schedule" },
    { id: "pending", label: "Pending bookings", href: "/admin/bookings?status=Pending", keywords: "queue" },
    { id: "inprog", label: "In progress bookings", href: "/admin/bookings?status=In%20Progress", keywords: "floor workshop" },
    { id: "customers", label: "Customers", href: "/admin/customers", keywords: "directory crm email whatsapp" },
    { id: "cars", label: "Cars", href: "/admin/cars", keywords: "fleet vehicles workshop models" },
    {
      id: "quotes",
      label: "Quote requests",
      href: "/admin/quotes",
      keywords: "quotation estimate parts pipeline submitted",
    },
    {
      id: "quotes-submitted",
      label: "Quotes — awaiting price",
      href: "/admin/quotes?status=Submitted",
      keywords: "new enquiry pricing",
    },
    { id: "help", label: "Help", href: "/admin/help", keywords: "docs guide" },
    { id: "site", label: "Open customer site", href: "/", hint: "Opens in a new tab", keywords: "public website booking" },
  ];
}

export function AdminSearchButton({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 ${className}`}
      aria-label="Search admin pages"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    </button>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AdminCommandPalette({ open, onOpenChange }: Props) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const todayYmd = useMemo(() => ymdLocal(), []);
  const commands = useMemo(() => buildCommands(todayYmd), [todayYmd]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands;
    return commands.filter((c) => {
      const hay = `${c.label} ${c.keywords ?? ""} ${c.hint ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [commands, q]);

  useEffect(() => {
    const onExternalOpen = () => onOpenChange(true);
    window.addEventListener(OPEN_EVENT, onExternalOpen);
    return () => window.removeEventListener(OPEN_EVENT, onExternalOpen);
  }, [onOpenChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cmd-palette-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="card max-h-[min(70vh,520px)] w-full max-w-lg overflow-hidden shadow-2xl ring-2 ring-black/10 dark:ring-white/10">
            <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
              <label htmlFor="cmd-palette-input" id="cmd-palette-title" className="sr-only">
                Search admin pages
              </label>
              <input
                ref={inputRef}
                id="cmd-palette-input"
                autoComplete="off"
                placeholder="Search pages and shortcuts…"
                className="w-full rounded-lg border-0 bg-transparent px-2 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") close();
                }}
              />
            </div>
            <ul className="max-h-[min(55vh,420px)] overflow-y-auto p-2" role="listbox">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-zinc-500">No matches</li>
              ) : (
                filtered.map((c) => (
                  <li key={c.id} role="none">
                    {c.id === "site" ? (
                      <button
                        type="button"
                        role="option"
                        className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={() => {
                          close();
                          window.open(c.href, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">{c.label}</span>
                        {c.hint && <span className="text-xs text-zinc-500">{c.hint}</span>}
                      </button>
                    ) : (
                      <Link
                        href={c.href}
                        role="option"
                        className="flex flex-col rounded-lg px-3 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={() => close()}
                      >
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">{c.label}</span>
                        {c.hint && <span className="text-xs text-zinc-500">{c.hint}</span>}
                      </Link>
                    )}
                  </li>
                ))
              )}
            </ul>
            <p className="border-t border-zinc-200 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Tip: filter by typing. Press Esc to close. Shortcut:{" "}
              {typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘K" : "Ctrl+K"}.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
