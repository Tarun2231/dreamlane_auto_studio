"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/api";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "viewer";
  isActive: boolean;
  mustResetPassword: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Draft = {
  name: string;
  email: string;
  newPassword: string;
  role: "owner" | "admin" | "viewer";
  isActive: boolean;
  mustResetPassword: boolean;
};

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function AdminTeamAccessCard() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"owner" | "admin" | "viewer">("admin");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  async function loadUsers() {
    const res = await adminApi.get<{ items: AdminUser[] }>("admins");
    setItems(res.data.items || []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadUsers();
      } catch (e: unknown) {
        if (!cancelled) setError(getErrorMessage(e, "Could not load admin users."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const userIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, Draft> = {};
      for (const item of items) {
        const existing = prev[item.id];
        next[item.id] = existing || {
          name: item.name || "",
          email: item.email || "",
          newPassword: "",
          role: item.role || "admin",
          isActive: item.isActive !== false,
          mustResetPassword: item.mustResetPassword === true,
        };
      }
      return next;
    });
  }, [items]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const email = createEmail.trim().toLowerCase();
    if (!email || !createPassword.trim()) {
      setError("Email and password are required for a new admin user.");
      return;
    }
    if (createPassword.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setCreating(true);
    try {
      await adminApi.post("admins", {
        name: createName.trim() || "Admin",
        email,
        password: createPassword.trim(),
        role: createRole,
      });
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("admin");
      await loadUsers();
      setMessage("Admin access added successfully.");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Could not add admin user."));
    } finally {
      setCreating(false);
    }
  }

  async function onSave(id: string) {
    const d = drafts[id];
    if (!d) return;
    setError("");
    setMessage("");
    const payload: {
      name?: string;
      email?: string;
      newPassword?: string;
      role?: "owner" | "admin" | "viewer";
      isActive?: boolean;
      mustResetPassword?: boolean;
    } = {};
    if (d.name.trim()) payload.name = d.name.trim();
    if (d.email.trim()) payload.email = d.email.trim().toLowerCase();
    if (d.newPassword.trim()) payload.newPassword = d.newPassword.trim();
    payload.role = d.role;
    payload.isActive = d.isActive;
    payload.mustResetPassword = d.mustResetPassword;
    if (!payload.name && !payload.email && !payload.newPassword && payload.role === undefined) {
      setError("Add at least one change before saving.");
      return;
    }
    setSavingId(id);
    try {
      await adminApi.put(`admins/${id}`, payload);
      setDrafts((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || {
            name: "",
            email: "",
            newPassword: "",
            role: "admin",
            isActive: true,
            mustResetPassword: false,
          }),
          newPassword: "",
        },
      }));
      await loadUsers();
      setMessage("Admin account updated.");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Could not update admin user."));
    } finally {
      setSavingId("");
    }
  }

  async function onRemove(id: string) {
    setError("");
    setMessage("");
    const ok = window.confirm("Disable this admin account? They will no longer be able to log in until re-enabled.");
    if (!ok) return;
    setSavingId(id);
    try {
      await adminApi.delete(`admins/${id}`);
      await loadUsers();
      setMessage("Admin account disabled.");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Could not disable admin access."));
    } finally {
      setSavingId("");
    }
  }

  async function onDeletePermanent(id: string, email: string) {
    setError("");
    setMessage("");
    const ok = window.confirm(
      `Permanently delete the admin credentials for "${email}"? This action cannot be undone.`
    );
    if (!ok) return;
    setSavingId(id);
    try {
      await adminApi.delete(`admins/${id}?permanent=true`);
      await loadUsers();
      setMessage(`Admin credentials for ${email} permanently deleted.`);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Could not delete admin account."));
    } finally {
      setSavingId("");
    }
  }

  function onCopyCredentials(email: string, role: string) {
    const text = `Admin Portal Access\nURL: ${window.location.origin}/admin/login\nEmail: ${email}\nRole: ${role}`;
    navigator.clipboard?.writeText(text);
    setMessage(`Login details copied to clipboard for ${email}`);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/50">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Team access (multiple admins)</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Add admin users for your team. Each admin signs in with their own email/password, and their sign-in activity appears in login history.
        </p>
      </div>

      <form onSubmit={onCreate} className="grid gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-700/70 dark:bg-zinc-950/50 md:grid-cols-5">
        <input
          type="text"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          placeholder="Name (optional)"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <input
          type="email"
          value={createEmail}
          onChange={(e) => setCreateEmail(e.target.value)}
          placeholder="friend@example.com"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          required
        />
        <input
          type="password"
          value={createPassword}
          onChange={(e) => setCreatePassword(e.target.value)}
          placeholder="Password (min 8)"
          minLength={8}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          required
        />
        <select
          value={createRole}
          onChange={(e) => setCreateRole(e.target.value as "owner" | "admin" | "viewer")}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="viewer">Viewer</option>
        </select>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {creating ? "Adding..." : "Add admin"}
        </button>
      </form>

      {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading team access…</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const d = drafts[item.id] || {
              name: "",
              email: "",
              newPassword: "",
              role: "admin",
              isActive: true,
              mustResetPassword: false,
            };
            return (
              <div key={item.id} className="rounded-xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
                <div className="mb-2 grid gap-2 text-xs text-zinc-500 dark:text-zinc-400 md:grid-cols-2">
                  <p>Created: {formatWhen(item.createdAt)}</p>
                  <p>Updated: {formatWhen(item.updatedAt)}</p>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <input
                    type="text"
                    value={d.name}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [item.id]: { ...d, name: e.target.value },
                      }))
                    }
                    placeholder="Name"
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <input
                    type="email"
                    value={d.email}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [item.id]: { ...d, email: e.target.value },
                      }))
                    }
                    placeholder="Email"
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <input
                    type="password"
                    value={d.newPassword}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [item.id]: { ...d, newPassword: e.target.value },
                      }))
                    }
                    placeholder="New password (optional)"
                    minLength={8}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <select
                    value={d.role}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [item.id]: { ...d, role: e.target.value as "owner" | "admin" | "viewer" },
                      }))
                    }
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={d.isActive}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...d, isActive: e.target.checked },
                        }))
                      }
                    />
                    Active
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={d.mustResetPassword}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...d, mustResetPassword: e.target.checked },
                        }))
                      }
                    />
                    Force reset
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.isActive
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {d.isActive ? "● Active" : "○ Disabled"}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">ID: {item.id}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onCopyCredentials(d.email, d.role)}
                      className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      title="Copy login details to clipboard"
                    >
                      📋 Copy Details
                    </button>
                    <button
                      type="button"
                      disabled={savingId === item.id || !userIds.has(item.id)}
                      onClick={() => onSave(item.id)}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingId === item.id ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => onRemove(item.id)}
                      className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
                      title="Disable this account without deleting"
                    >
                      {d.isActive ? "Disable" : "Re-enable"}
                    </button>
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => onDeletePermanent(item.id, d.email)}
                      className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Permanently delete this user from database"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 ? <p className="text-sm text-zinc-500 dark:text-zinc-400">No admin users found.</p> : null}
        </div>
      )}
    </section>
  );
}
