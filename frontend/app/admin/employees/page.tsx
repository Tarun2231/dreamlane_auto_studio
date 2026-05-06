"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/api";

type SalaryRow = {
  month: string;
  amountInr: number;
  status: "paid" | "partial" | "unpaid";
  paidOn?: string;
  note?: string;
};

type Employee = {
  id: string;
  name: string;
  phone: string;
  email: string;
  roleTitle: string;
  joinedOn: string;
  monthlySalaryInr: number;
  isActive: boolean;
  notes: string;
  salaryLedger: SalaryRow[];
};

const box = "rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/50";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function formatInr(amount: number) {
  return `INR ${Math.round(Number(amount || 0)).toLocaleString("en-IN")}`;
}

function escCsv(v: string | number) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function toWhatsAppNumber(phone: string) {
  return phone.replace(/\D/g, "");
}

export default function AdminEmployeesPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expandedId, setExpandedId] = useState<string>("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [joinedOn, setJoinedOn] = useState("");
  const [monthlySalaryInr, setMonthlySalaryInr] = useState("");
  const [notes, setNotes] = useState("");

  const [salaryMonth, setSalaryMonth] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [salaryStatus, setSalaryStatus] = useState<"paid" | "partial" | "unpaid">("unpaid");
  const [salaryPaidOn, setSalaryPaidOn] = useState("");
  const [salaryNote, setSalaryNote] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [markAllBusy, setMarkAllBusy] = useState(false);

  async function load() {
    const res = await adminApi.get<{ items: Employee[] }>("/employees");
    setItems(res.data.items || []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message || "Could not load employees.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("adminEmployees:selectedMonth");
      if (saved && /^\d{4}-\d{2}$/.test(saved)) setSelectedMonth(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    try {
      localStorage.setItem("adminEmployees:selectedMonth", selectedMonth);
    } catch {}
  }, [selectedMonth]);

  async function addEmployee(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await adminApi.post("/employees", {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        roleTitle: roleTitle.trim(),
        joinedOn,
        monthlySalaryInr: Number(monthlySalaryInr || 0),
        notes: notes.trim(),
      });
      setName("");
      setPhone("");
      setEmail("");
      setRoleTitle("");
      setJoinedOn("");
      setMonthlySalaryInr("");
      setNotes("");
      await load();
      setMessage("Employee added.");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not add employee.");
    }
  }

  async function saveSalary(employeeId: string) {
    setError("");
    setMessage("");
    try {
      await adminApi.post(`/employees/${employeeId}/salary`, {
        month: salaryMonth,
        amountInr: Number(salaryAmount || 0),
        status: salaryStatus,
        paidOn: salaryPaidOn,
        note: salaryNote.trim(),
      });
      await load();
      setMessage("Salary status updated.");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not update salary.");
    }
  }

  async function toggleActive(item: Employee) {
    setError("");
    setMessage("");
    try {
      await adminApi.put(`/employees/${item.id}`, { isActive: !item.isActive });
      await load();
      setMessage("Employee status updated.");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not update employee.");
    }
  }

  function exportCsv() {
    const header = [
      "Employee Name",
      "Phone",
      "Email",
      "Role",
      "Monthly Salary INR",
      "Active",
      "Salary Month",
      "Salary Amount INR",
      "Salary Status",
      "Salary Paid On",
      "Salary Note",
    ];

    const lines: string[] = [header.map(escCsv).join(",")];
    items.forEach((item) => {
      const rows = item.salaryLedger?.length
        ? item.salaryLedger
        : [{ month: "", amountInr: 0, status: "unpaid" as const, paidOn: "", note: "" }];
      rows.forEach((row) => {
        lines.push(
          [
            item.name,
            item.phone,
            item.email || "",
            item.roleTitle || "",
            Math.round(item.monthlySalaryInr || 0),
            item.isActive ? "yes" : "no",
            row.month || "",
            Math.round(Number(row.amountInr || 0)),
            row.status || "unpaid",
            row.paidOn || "",
            row.note || "",
          ]
            .map(escCsv)
            .join(",")
        );
      });
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const monthStats = useMemo(() => {
    const totalEmployees = items.filter((i) => i.isActive).length;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let paidAmount = 0;
    let expectedAmount = 0;
    const reminders: Array<{ id: string; name: string; phone: string; roleTitle: string; monthlySalaryInr: number; status: string }> = [];

    items.forEach((item) => {
      if (!item.isActive) return;
      expectedAmount += Number(item.monthlySalaryInr || 0);
      const row = (item.salaryLedger || []).find((x) => x.month === selectedMonth);
      const status = row?.status || "unpaid";
      const amount = Number(row?.amountInr || 0);
      if (status === "paid") {
        paidCount += 1;
        paidAmount += amount;
        return;
      }
      if (status === "partial") {
        partialCount += 1;
        paidAmount += amount;
      } else {
        unpaidCount += 1;
      }
      reminders.push({
        id: item.id,
        name: item.name,
        phone: item.phone,
        roleTitle: item.roleTitle || "Employee",
        monthlySalaryInr: Number(item.monthlySalaryInr || 0),
        status,
      });
    });

    return {
      totalEmployees,
      paidCount,
      partialCount,
      unpaidCount,
      paidAmount,
      expectedAmount,
      pendingAmount: Math.max(0, expectedAmount - paidAmount),
      reminders,
    };
  }, [items, selectedMonth]);

  async function markAllAsPaidForMonth() {
    if (!selectedMonth) {
      setError("Select a month first.");
      return;
    }
    const targets = monthStats.reminders.filter((row) => row.status !== "paid");
    if (targets.length === 0) {
      setMessage("All active employees are already marked paid.");
      return;
    }
    setError("");
    setMessage("");
    setMarkAllBusy(true);
    try {
      await Promise.all(
        targets.map((row) =>
          adminApi.post(`/employees/${row.id}/salary`, {
            month: selectedMonth,
            amountInr: row.monthlySalaryInr,
            status: "paid",
            paidOn: todayYmd(),
            note: "Marked paid in bulk update",
          })
        )
      );
      await load();
      setMessage(`Marked ${targets.length} employee salaries as paid for ${selectedMonth}.`);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not mark all salaries as paid.");
    } finally {
      setMarkAllBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-zinc-200/80 pb-5 dark:border-zinc-700/80">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Employees</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Add employees, store contact details, and track whether salary is paid or pending by month.
        </p>
      </header>

      <section className={`${box} space-y-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Salary overview</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Monthly summary + reminders for unpaid salaries.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => void markAllAsPaidForMonth()}
              disabled={markAllBusy}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markAllBusy ? "Marking..." : "Mark all paid"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/70">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Active employees</p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{monthStats.totalEmployees}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="text-xs text-emerald-700 dark:text-emerald-400">Paid in full</p>
            <p className="text-xl font-semibold text-emerald-900 dark:text-emerald-300">{monthStats.paidCount}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="text-xs text-amber-700 dark:text-amber-400">Partial</p>
            <p className="text-xl font-semibold text-amber-900 dark:text-amber-300">{monthStats.partialCount}</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
            <p className="text-xs text-rose-700 dark:text-rose-400">Unpaid</p>
            <p className="text-xl font-semibold text-rose-900 dark:text-rose-300">{monthStats.unpaidCount}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Expected payout ({selectedMonth})</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatInr(monthStats.expectedAmount)}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Paid amount ({selectedMonth})</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatInr(monthStats.paidAmount)}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Pending amount ({selectedMonth})</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatInr(monthStats.pendingAmount)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="border-b border-zinc-200 px-3 py-2 text-sm font-semibold dark:border-zinc-700">Salary reminders ({selectedMonth})</div>
          {monthStats.reminders.length === 0 ? (
            <p className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400">All active employees are marked paid for this month.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {monthStats.reminders.map((row) => (
                <li key={`rem-${row.id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {row.name} <span className="text-zinc-500 dark:text-zinc-400">({row.roleTitle})</span>
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {row.phone} · {formatInr(row.monthlySalaryInr)} · {row.status}
                  </span>
                  <a
                    href={`https://wa.me/${toWhatsAppNumber(row.phone)}?text=${encodeURIComponent(
                      `Hi ${row.name}, salary for ${selectedMonth} is ${row.status}. Please confirm with accounts.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                  >
                    WhatsApp reminder
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <form onSubmit={addEmployee} className={`${box} grid gap-2 md:grid-cols-4`}>
        <input className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950" placeholder="Employee name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <input className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950" placeholder="Role / designation" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
        <input type="date" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950" value={joinedOn} onChange={(e) => setJoinedOn(e.target.value)} />
        <input type="number" min={0} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950" placeholder="Monthly salary (INR)" value={monthlySalaryInr} onChange={(e) => setMonthlySalaryInr(e.target.value)} />
        <input className="rounded-lg border border-zinc-300 px-3 py-2 text-sm md:col-span-2 dark:border-zinc-600 dark:bg-zinc-950" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">Add employee</button>
      </form>

      {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading employees...</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={box}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {item.roleTitle || "Employee"} · {item.phone}
                    {item.email ? ` · ${item.email}` : ""}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Joined: {item.joinedOn || "—"} · Salary: INR {Math.round(item.monthlySalaryInr || 0).toLocaleString("en-IN")} · Status: {item.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void toggleActive(item)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold dark:border-zinc-600">
                    {item.isActive ? "Disable" : "Activate"}
                  </button>
                  <button type="button" onClick={() => setExpandedId(expandedId === item.id ? "" : item.id)} className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600">
                    {expandedId === item.id ? "Hide salary" : "Track salary"}
                  </button>
                </div>
              </div>

              {expandedId === item.id ? (
                <div className="mt-4 space-y-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                  <div className="grid gap-2 md:grid-cols-5">
                    <input type="month" value={salaryMonth} onChange={(e) => setSalaryMonth(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950" />
                    <input type="number" min={0} value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} placeholder="Amount (INR)" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950" />
                    <select value={salaryStatus} onChange={(e) => setSalaryStatus(e.target.value as "paid" | "partial" | "unpaid")} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950">
                      <option value="paid">Paid</option>
                      <option value="partial">Partial</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                    <input type="date" value={salaryPaidOn} onChange={(e) => setSalaryPaidOn(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950" />
                    <button type="button" onClick={() => void saveSalary(item.id)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
                      Save salary
                    </button>
                  </div>
                  <input value={salaryNote} onChange={(e) => setSalaryNote(e.target.value)} placeholder="Salary note (optional)" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950" />

                  <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        <tr>
                          <th className="px-3 py-2 text-left">Month</th>
                          <th className="px-3 py-2 text-left">Amount</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Paid on</th>
                          <th className="px-3 py-2 text-left">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(item.salaryLedger || [])
                          .slice()
                          .sort((a, b) => String(b.month).localeCompare(String(a.month)))
                          .map((row) => (
                            <tr key={`${item.id}-${row.month}`} className="border-t border-zinc-200 dark:border-zinc-700">
                              <td className="px-3 py-2">{row.month}</td>
                              <td className="px-3 py-2">INR {Math.round(Number(row.amountInr || 0)).toLocaleString("en-IN")}</td>
                              <td className="px-3 py-2">{row.status}</td>
                              <td className="px-3 py-2">{row.paidOn || "—"}</td>
                              <td className="px-3 py-2">{row.note || "—"}</td>
                            </tr>
                          ))}
                        {(item.salaryLedger || []).length === 0 ? (
                          <tr>
                            <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400" colSpan={5}>
                              No salary records yet.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {items.length === 0 ? <p className="text-sm text-zinc-500 dark:text-zinc-400">No employees added yet.</p> : null}
        </div>
      )}
    </div>
  );
}
