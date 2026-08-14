"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";

type AdminAccount = {
  id: string;
  name: string;
  email: string;
};

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function AdminAccountSettingsCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<AdminAccount | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminApi.get<AdminAccount>("account");
        if (cancelled) return;
        setAccount(res.data);
        setEmail(res.data.email || "");
      } catch (e: unknown) {
        if (!cancelled) setError(getErrorMessage(e, "Could not load admin account."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const changingEmail = trimmedEmail !== (account?.email || "").toLowerCase();
    const changingPassword = newPassword.trim().length > 0;

    if (!changingEmail && !changingPassword) {
      setError("Change email or set a new password first.");
      return;
    }
    if (!currentPassword.trim()) {
      setError("Enter your current password to confirm changes.");
      return;
    }
    if (changingPassword && newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setSaving(true);
    try {
      await adminApi.put("account", {
        email: changingEmail ? trimmedEmail : undefined,
        newPassword: changingPassword ? newPassword : undefined,
        currentPassword,
      });
      setMessage("Credentials updated. Please log in again with the new details.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      localStorage.removeItem("adminToken");
      setTimeout(() => router.replace("/admin/login"), 900);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to update credentials."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/50">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Admin account credentials</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Update your admin login email/password here. Changes are saved to the database.
      </p>

      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading account details…</p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Current admin email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-0 focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              required
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Current password (required)</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-0 focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              required
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">New password (optional)</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-0 focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="Leave blank to keep current password"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-0 focus:border-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="Only needed if setting new password"
            />
          </label>

          {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
          {message ? <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{message}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? "Saving..." : "Update credentials"}
          </button>
        </form>
      )}
    </section>
  );
}
