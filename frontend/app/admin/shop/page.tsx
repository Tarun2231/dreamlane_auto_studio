"use client";

/* eslint-disable @next/next/no-img-element -- admin previews arbitrary image URLs */
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { ShopProductAdmin } from "@/lib/types";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );
}

const emptyForm = {
  name: "",
  description: "",
  productGroup: "accessory" as "machine" | "accessory" | "other",
  category: "Headlights",
  image: "",
  basePrice: "",
  discountPercent: "0",
  sortOrder: "0",
  stock: "",
};

export default function AdminShopProductsPage() {
  const [products, setProducts] = useState<ShopProductAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageUploadBusy, setImageUploadBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const uploadProductImage = async (file: File) => {
    setImageUploadBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await adminApi.post<{ url: string }>("/upload/shop-product-image", fd);
      const u = res.data?.url;
      if (!u || typeof u !== "string") throw new Error("No URL returned");
      setForm((f) => ({ ...f, image: u }));
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      const msg =
        ax.response?.data?.message ||
        "Upload failed. Use a supported image under 5MB, or paste an image URL instead.";
      setError(msg);
    } finally {
      setImageUploadBusy(false);
    }
  };

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await adminApi.get<ShopProductAdmin[]>("/shop-products");
      setProducts(res.data);
    } catch {
      setError("Could not load products.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (p: ShopProductAdmin) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      description: p.description || "",
      productGroup: p.productGroup || "accessory",
      category: p.category || "General",
      image: p.image || "",
      basePrice: String(p.basePrice),
      discountPercent: String(p.discountPercent ?? 0),
      sortOrder: String(p.sortOrder ?? 0),
      stock: p.stock != null ? String(p.stock) : "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const stockTrim = form.stock.trim();
      if (stockTrim !== "") {
        const s = Math.floor(Number(stockTrim));
        if (!Number.isFinite(s) || s < 0) {
          setError("Stock must be a whole number ≥ 0, or leave blank to not track inventory.");
          setSaving(false);
          return;
        }
      }
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim(),
        productGroup: form.productGroup,
        category: form.category.trim() || "General",
        image: form.image.trim(),
        basePrice: Number(form.basePrice),
        discountPercent: Number(form.discountPercent),
        sortOrder: Number(form.sortOrder),
        isActive: true,
      };
      if (stockTrim === "") {
        if (editingId) payload.stock = null;
      } else {
        payload.stock = Math.floor(Number(stockTrim));
      }
      if (editingId) {
        await adminApi.put(`/shop-products/${editingId}`, payload);
      } else {
        await adminApi.post("/shop-products", payload);
      }
      cancelEdit();
      await load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      const msg = ax.response?.data?.message;
      setError(typeof msg === "string" ? msg : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: string) => {
    if (!confirm("Hide this product from the customer shop?")) return;
    setSaving(true);
    try {
      await adminApi.delete(`/shop-products/${id}`);
      await load();
      if (editingId === id) cancelEdit();
    } catch {
      setError("Could not archive product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Shop products</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Set <strong className="font-medium text-zinc-800 dark:text-zinc-200">type</strong> (machine vs accessory), then a category
          (e.g. Batteries, Headlights). List price, discount (%), and optional stock — customers see availability on the shop and cart.
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <section className="card p-6">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{editingId ? "Edit product" : "Add product"}</h2>
        <form onSubmit={(e) => void save(e)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Name</label>
            <input
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Product type</label>
            <select
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              value={form.productGroup}
              onChange={(e) =>
                setForm((f) => ({ ...f, productGroup: e.target.value as "machine" | "accessory" | "other" }))
              }
            >
              <option value="machine">Machine (workshop equipment)</option>
              <option value="accessory">Accessory (lights, batteries, car parts)</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Description</label>
            <textarea
              className="min-h-[88px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Product image</span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  className="sr-only"
                  disabled={saving || imageUploadBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadProductImage(f);
                  }}
                />
                {imageUploadBusy ? "Uploading…" : "Upload image"}
              </label>
              {form.image.trim() ? (
                <div className="flex min-w-0 max-w-full items-center gap-3">
                  <img
                    src={form.image}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg border border-zinc-200 object-cover dark:border-zinc-600"
                  />
                  <p className="break-all text-xs text-zinc-500 dark:text-zinc-400">{form.image}</p>
                </div>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400" htmlFor="shop-product-image-url">
                Image URL (optional — paste a link or use upload)
              </label>
              <input
                id="shop-product-image-url"
                type="text"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
                placeholder="https://…"
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Category (sub-type)</label>
            <input
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              placeholder="e.g. Headlights, Batteries, Carbon cleaning"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">List price (INR)</label>
            <input
              required
              type="number"
              min={0}
              step={1}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              value={form.basePrice}
              onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Discount %</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              value={form.discountPercent}
              onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Stock (units, optional)</label>
            <input
              type="number"
              min={0}
              step={1}
              placeholder="Blank = not tracked"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
            />
            <p className="mt-1 text-xs text-zinc-500">When set, checkout reduces this count. Clear the field to stop tracking.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Sort order (higher first)</label>
            <input
              type="number"
              step={1}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" className="btn-primary min-h-11 px-5 text-sm font-semibold disabled:opacity-50" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update product" : "Create product"}
            </button>
            {editingId ? (
              <button type="button" className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm dark:border-zinc-600" onClick={cancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Catalog</h2>
        {loading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading…</p>
        ) : products.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No products yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">List</th>
                  <th className="px-3 py-2">Off %</th>
                  <th className="px-3 py-2">Effective</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {products.map((p) => (
                  <tr key={p._id} className={p.isActive ? "" : "opacity-60"}>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 capitalize text-zinc-600 dark:text-zinc-400">{p.productGroup || "accessory"}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{p.category}</td>
                    <td className="px-3 py-2 tabular-nums">{formatInr(p.basePrice)}</td>
                    <td className="px-3 py-2 tabular-nums">{p.discountPercent ?? 0}%</td>
                    <td className="px-3 py-2 font-medium tabular-nums">{formatInr(p.effectivePrice)}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-600 dark:text-zinc-400">
                      {p.stock != null ? p.stock : "—"}
                    </td>
                    <td className="px-3 py-2">{p.isActive ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="text-blue-700 hover:underline dark:text-blue-400" onClick={() => startEdit(p)}>
                        Edit
                      </button>
                      {p.isActive ? (
                        <button
                          type="button"
                          className="ml-3 text-red-700 hover:underline dark:text-red-400"
                          onClick={() => void archive(p._id)}
                        >
                          Hide
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
