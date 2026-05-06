import Link from "next/link";
import AdminAccountSettingsCard from "@/components/admin/AdminAccountSettingsCard";
import { ADMIN_APP_VERSION } from "@/lib/adminMeta";

export const metadata = {
  title: "Help",
};

export default function AdminHelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="border-b border-zinc-200/80 pb-6 dark:border-zinc-700/80">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Admin help</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Quick reference for the operations panel. Console version <span className="font-mono">{ADMIN_APP_VERSION}</span>.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Keyboard &amp; display</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            Press <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">Tab</kbd> once after load to use{" "}
            <strong>Skip to main content</strong> (keyboard users), or use{" "}
            <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">Ctrl</kbd>{" "}
            + <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">K</kbd>{" "}
            (or <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">⌘K</kbd> on Mac) to open search.
          </li>
          <li>
            Use the <strong>moon / sun</strong> button at the top of the page (next to Search) to toggle dark mode; your choice is saved in this browser.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Navigation</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            <strong>Dashboard</strong> — KPIs, date filters for the selected period,{" "}
            <strong>Workshop insights</strong> (completed revenue, jobs on the floor today, tomorrow&apos;s bookings, vehicle mix), and quick links to other areas.
          </li>
          <li>
            <strong>Services</strong> — Packages shown on the public site; set follow-up months for reminder emails.
          </li>
          <li>
            <strong>Slots</strong> — Availability customers book against; bulk-create by date range + times.
          </li>
          <li>
            <strong>Bookings</strong> — Status workflow, job sheets, photos, invoices; filter by date and status.
          </li>
          <li>
            <strong>Customers</strong> — Everyone with a completed visit; WhatsApp / email outreach and service history.
          </li>
          <li>
            <strong>Quotes</strong> — Custom enquiries from the public &quot;Get quote&quot; page; enter amount and notes, save, then email the quotation. Customers accept or decline on Track quote.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Customer quotation flow</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Customer submits work description and optional parts notes on the website.</li>
          <li>You review in <strong>Quotes</strong>, set <strong>Quoted amount</strong> and <strong>Quote notes</strong>, click <strong>Save</strong>.</li>
          <li>Click <strong>Email quotation</strong> (needs SMTP). Status becomes <strong>Quoted</strong>.</li>
          <li>Customer uses <strong>Track quote</strong> with ID + email; they can <strong>Accept</strong> or <strong>Decline</strong>.</li>
          <li>Optional: set <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">WORKSHOP_QUOTE_EMAIL</code> in <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">frontend/backend/.env</code> to receive new requests.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Customer booking flow</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Customer picks a service, then selects body type, make, model, and year from lists; chassis number (from RC) is typed on the last step for parts lookup.</li>
          <li>They choose an open slot (only available times are shown).</li>
          <li>After submit, they get a confirmation URL; they can track with booking ID + email.</li>
          <li>You move the booking through Pending → In Progress → Completed in Bookings.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Email &amp; PDFs</h2>
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          Transactional email (confirmations, job sheet, invoice) and manual customer email from the Customers page need{" "}
          <strong>SMTP</strong> variables in <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">frontend/backend/.env</code>.
          If sending fails, check server logs and SMTP credentials.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Tips</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            Use <strong>Attention</strong> counts and <strong>Workshop insights</strong> to see what&apos;s on the floor today, how many bookings are scheduled for tomorrow, and rough vehicle-type mix for the period.
          </li>
          <li>Disable a slot instead of deleting it if you need to block a time without removing history.</li>
          <li>Export customer CSV from the Customers page after filtering.</li>
        </ul>
      </section>

      <AdminAccountSettingsCard />

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/admin" className="font-medium text-amber-800 underline dark:text-amber-400">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}
