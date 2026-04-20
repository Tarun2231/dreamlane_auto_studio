"use client";

/* eslint-disable @next/next/no-img-element -- admin may paste any image URL; avoid Next/Image remotePatterns churn */
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { api, adminApi } from "@/lib/api";
import { serviceImageUrl } from "@/lib/images";
import { Service } from "@/lib/types";

type ServiceForm = {
  name: string;
  description: string;
  image: string;
  basePrice: number;
  duration: number;
  followUpMonths: number | "";
};

const empty: ServiceForm = { name: "", description: "", image: "", basePrice: 0, duration: 0, followUpMonths: "" };

const inputClass =
  "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none ring-amber-500/0 transition placeholder:text-zinc-400 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500";

const labelClass = "mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400";

function formatPrice(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [imageUploadBusy, setImageUploadBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [query, setQuery] = useState("");

  const uploadServiceImageFile = async (file: File, which: "add" | "edit") => {
    setImageUploadBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await adminApi.post<{ url: string }>("/upload/service-image", fd);
      const u = res.data?.url;
      if (!u || typeof u !== "string") throw new Error("No URL returned");
      if (which === "add") setForm((f) => ({ ...f, image: u }));
      else setEditForm((f) => ({ ...f, image: u }));
      setMessage({ type: "ok", text: "Image uploaded. Save or add the service when you’re ready." });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Upload failed. Use JPEG, PNG, GIF, or WebP under 5MB, or paste an image URL instead.";
      setMessage({ type: "err", text: msg });
    } finally {
      setImageUploadBusy(false);
    }
  };

  const load = () =>
    api
      .get<Service[]>("/services")
      .then((res) => setServices(res.data))
      .catch(() => {
        setMessage({ type: "err", text: "Could not load services. Is the API running?" });
      })
      .finally(() => setListLoading(false));

  useEffect(() => void load(), []);

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return services;
    return services.filter(
      (svc) =>
        svc.name.toLowerCase().includes(s) ||
        svc.description.toLowerCase().includes(s) ||
        String(svc.basePrice).includes(s)
    );
  }, [services, query]);

  const payloadFromForm = (f: ServiceForm) => ({
    name: f.name,
    description: f.description,
    image: f.image,
    basePrice: f.basePrice,
    duration: f.duration,
    followUpMonths: f.followUpMonths === "" ? null : Number(f.followUpMonths),
  });

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await adminApi.post("/service", payloadFromForm(form));
      setForm(empty);
      await load();
      setMessage({ type: "ok", text: "Service added." });
    } catch {
      setMessage({ type: "err", text: "Could not create service. Check auth and try again." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this service? Bookings that reference it may still show the name in history.")) return;
    setBusy(true);
    setMessage(null);
    try {
      await adminApi.delete(`/service/${id}`);
      if (editingId === id) setEditingId(null);
      await load();
      setMessage({ type: "ok", text: "Service removed." });
    } catch {
      setMessage({ type: "err", text: "Delete failed." });
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (service: Service) => {
    setEditingId(service._id);
    setEditForm({
      name: service.name,
      description: service.description,
      image: service.image,
      basePrice: service.basePrice,
      duration: service.duration,
      followUpMonths:
        service.followUpMonths != null && Number(service.followUpMonths) > 0
          ? Number(service.followUpMonths)
          : "",
    });
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setBusy(true);
    setMessage(null);
    try {
      await adminApi.put(`/service/${editingId}`, payloadFromForm(editForm));
      setEditingId(null);
      await load();
      setMessage({ type: "ok", text: "Service updated." });
    } catch {
      setMessage({ type: "err", text: "Update failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 border-b border-zinc-200/80 pb-6 dark:border-zinc-700/80 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">Service Management</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create packages, set pricing and duration, optional follow-up reminders for customers.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          onClick={() => {
            setListLoading(true);
            void load();
          }}
          disabled={listLoading || busy}
        >
          {listLoading ? "Refreshing…" : "Refresh list"}
        </button>
      </header>

      {message && (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          }`}
        >
          {message.text}
        </p>
      )}

      <section aria-labelledby="add-service-heading">
        <h2 id="add-service-heading" className="mb-3 text-base font-semibold text-zinc-800 dark:text-zinc-200">
          Add a service
        </h2>
        <form onSubmit={create} className="card space-y-4 p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="svc-name">
                Name
              </label>
              <input
                id="svc-name"
                className={inputClass}
                placeholder="e.g. Full synthetic service"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="svc-desc">
                Description
              </label>
              <textarea
                id="svc-desc"
                className={`${inputClass} min-h-[88px] resize-y`}
                placeholder="What’s included — customers see this on the site."
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <span className={labelClass}>Image</span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="sr-only"
                    disabled={busy || imageUploadBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void uploadServiceImageFile(f, "add");
                    }}
                  />
                  {imageUploadBusy ? "Uploading…" : "Upload image"}
                </label>
                {form.image.trim() ? (
                  <div className="flex min-w-0 max-w-full items-center gap-3">
                    <img
                      src={serviceImageUrl(form.image)}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg border border-zinc-200 object-cover dark:border-zinc-600"
                    />
                    <p className="break-all text-xs text-zinc-500 dark:text-zinc-400">{form.image}</p>
                  </div>
                ) : null}
              </div>
              <div>
                <label className={labelClass} htmlFor="svc-image">
                  Image URL (optional — paste a link or use upload)
                </label>
                <input
                  id="svc-image"
                  className={inputClass}
                  placeholder="https://… or leave empty for default placeholder image"
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="svc-price">
                Base price (₹)
              </label>
              <input
                id="svc-price"
                className={inputClass}
                type="number"
                min={0}
                step={1}
                required
                value={form.basePrice || ""}
                onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="svc-duration">
                Duration (minutes)
              </label>
              <input
                id="svc-duration"
                className={inputClass}
                type="number"
                min={1}
                step={1}
                required
                value={form.duration || ""}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="svc-follow">
                Follow-up reminder (months, optional)
              </label>
              <input
                id="svc-follow"
                className={inputClass}
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 12 for annual reminder emails"
                value={form.followUpMonths === "" ? "" : form.followUpMonths}
                onChange={(e) =>
                  setForm({
                    ...form,
                    followUpMonths: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 sm:w-auto sm:min-w-[160px]"
            disabled={busy}
          >
            {busy ? "Saving…" : "Add service"}
          </button>
        </form>
      </section>

      <section aria-labelledby="list-heading">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="list-heading" className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            Your services
            <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
              ({listLoading ? "…" : services.length})
            </span>
          </h2>
          <label className="sr-only" htmlFor="svc-search">
            Search services
          </label>
          <input
            id="svc-search"
            type="search"
            className={`${inputClass} max-w-md`}
            placeholder="Search by name, description, or price…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {listLoading ? (
          <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
            Loading services…
          </div>
        ) : filtered.length === 0 ? (
          <div className="card px-6 py-12 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {services.length === 0 ? (
              <>No services yet. Add one above to show it on the customer site.</>
            ) : (
              <>No services match your search. <button type="button" className="font-medium text-amber-800 underline dark:text-amber-400" onClick={() => setQuery("")}>Clear search</button></>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((service) => (
              <li key={service._id} className="card overflow-hidden">
                {editingId === service._id ? (
                  <form onSubmit={saveEdit} className="space-y-4 p-4 sm:p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Name</label>
                        <input
                          className={inputClass}
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Description</label>
                        <textarea
                          className={`${inputClass} min-h-[88px]`}
                          rows={3}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          required
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <span className={labelClass}>Image</span>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800">
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                              className="sr-only"
                              disabled={busy || imageUploadBusy}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                if (f) void uploadServiceImageFile(f, "edit");
                              }}
                            />
                            {imageUploadBusy ? "Uploading…" : "Upload image"}
                          </label>
                          {editForm.image.trim() ? (
                            <div className="flex min-w-0 max-w-full items-center gap-3">
                              <img
                                src={serviceImageUrl(editForm.image)}
                                alt=""
                                className="h-16 w-16 shrink-0 rounded-lg border border-zinc-200 object-cover dark:border-zinc-600"
                              />
                              <p className="break-all text-xs text-zinc-500 dark:text-zinc-400">{editForm.image}</p>
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <label className={labelClass}>Image URL (optional — paste a link or use upload)</label>
                          <input
                            className={inputClass}
                            type="text"
                            value={editForm.image}
                            onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Base price (₹)</label>
                        <input
                          className={inputClass}
                          type="number"
                          min={0}
                          step={1}
                          value={editForm.basePrice}
                          onChange={(e) => setEditForm({ ...editForm, basePrice: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Duration (minutes)</label>
                        <input
                          className={inputClass}
                          type="number"
                          min={1}
                          value={editForm.duration}
                          onChange={(e) => setEditForm({ ...editForm, duration: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Follow-up (months, optional)</label>
                        <input
                          className={inputClass}
                          type="number"
                          min={1}
                          value={editForm.followUpMonths === "" ? "" : editForm.followUpMonths}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              followUpMonths: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                        disabled={busy}
                      >
                        Save changes
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5">
                    <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:h-32 sm:w-40 dark:bg-zinc-800">
                      <img
                        src={serviceImageUrl(service.image)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{service.name}</p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{service.description}</p>
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                        Base ₹{formatPrice(service.basePrice)} · {service.duration} min
                        {service.followUpMonths != null && Number(service.followUpMonths) > 0
                          ? ` · Reminder +${service.followUpMonths} mo`
                          : ""}
                      </p>
                      <Link
                        href={`/services/${service._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-400"
                      >
                        View on live site →
                      </Link>
                    </div>
                    <div className="flex shrink-0 gap-2 self-start sm:flex-col sm:items-stretch">
                      <button
                        type="button"
                        className="min-h-10 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                        onClick={() => startEdit(service)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="min-h-10 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        onClick={() => void remove(service._id)}
                        disabled={busy}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
