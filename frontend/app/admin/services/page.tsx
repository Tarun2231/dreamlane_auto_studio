"use client";

import { type FormEvent, useEffect, useState } from "react";
import { api, adminApi } from "@/lib/api";
import { Service } from "@/lib/types";

const empty = { name: "", description: "", image: "", basePrice: 0, duration: 0 };

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => api.get<Service[]>("/services").then((res) => setServices(res.data));
  useEffect(() => void load(), []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await adminApi.post("/service", form);
      setForm(empty);
      await load();
      setMessage("Service added.");
    } catch {
      setMessage("Could not create service. Check auth and try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this service?")) return;
    setBusy(true);
    try {
      await adminApi.delete(`/service/${id}`);
      if (editingId === id) setEditingId(null);
      await load();
    } catch {
      setMessage("Delete failed.");
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
    });
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setBusy(true);
    try {
      await adminApi.put(`/service/${editingId}`, editForm);
      setEditingId(null);
      await load();
      setMessage("Service updated.");
    } catch {
      setMessage("Update failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Service Management</h1>
      {message && <p className="text-sm text-green-700">{message}</p>}
      <form onSubmit={create} className="card grid gap-3 p-5 md:grid-cols-2">
        <input
          className="rounded-xl border p-3"
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="rounded-xl border p-3 md:col-span-2"
          placeholder="Description"
          required
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          className="rounded-xl border p-3 md:col-span-2"
          placeholder="Image URL (https://…)"
          type="url"
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
        />
        <input
          className="rounded-xl border p-3"
          placeholder="Base price"
          type="number"
          min={0}
          step={0.01}
          required
          value={form.basePrice || ""}
          onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
        />
        <input
          className="rounded-xl border p-3"
          placeholder="Duration (minutes)"
          type="number"
          min={1}
          required
          value={form.duration || ""}
          onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
        />
        <button type="submit" className="rounded-xl bg-black px-5 py-3 text-white disabled:opacity-50" disabled={busy}>
          Add Service
        </button>
      </form>
      <div className="grid gap-3">
        {services.map((service) => (
          <div key={service._id} className="card p-4">
            {editingId === service._id ? (
              <form onSubmit={saveEdit} className="grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-xl border p-2"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
                <input
                  className="rounded-xl border p-2 md:col-span-2"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  required
                />
                <input
                  className="rounded-xl border p-2 md:col-span-2"
                  type="url"
                  value={editForm.image}
                  onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                />
                <input
                  className="rounded-xl border p-2"
                  type="number"
                  min={0}
                  step={0.01}
                  value={editForm.basePrice}
                  onChange={(e) => setEditForm({ ...editForm, basePrice: Number(e.target.value) })}
                  required
                />
                <input
                  className="rounded-xl border p-2"
                  type="number"
                  min={1}
                  value={editForm.duration}
                  onChange={(e) => setEditForm({ ...editForm, duration: Number(e.target.value) })}
                  required
                />
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <button type="submit" className="rounded-lg bg-black px-4 py-2 text-sm text-white" disabled={busy}>
                    Save
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-4 py-2 text-sm"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{service.name}</p>
                  <p className="text-sm text-gray-600">{service.description}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Base ${service.basePrice} · {service.duration} min
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => startEdit(service)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white"
                    onClick={() => void remove(service._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
