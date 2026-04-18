"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Service } from "@/lib/types";
import { modelsForMake, VEHICLE_MAKE_OPTIONS, VEHICLE_YEARS } from "@/lib/vehicleCatalog";

/** Must match backend `CUSTOM_SERVICE_ID`. */
export const QUOTE_CUSTOM_SERVICE = "__custom__";

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function QuoteRequestForm() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<"Hatchback" | "Sedan" | "SUV">("Hatchback");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [serviceDescription, setServiceDescription] = useState("");
  const [partsNotes, setPartsNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modelOptions = useMemo(() => modelsForMake(carMake), [carMake]);
  const isCustomService = serviceId === QUOTE_CUSTOM_SERVICE;

  useEffect(() => {
    api
      .get<Service[]>("/services")
      .then((res) => setServices(res.data))
      .catch(() => setError("Could not load services. Check that the server is running."));
  }, []);

  const submit = async () => {
    setError(null);
    if (customerName.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!emailOk(email)) {
      setError("Enter a valid email.");
      return;
    }
    if (phone.trim().length < 5) {
      setError("Enter a valid phone number.");
      return;
    }
    if (!carMake || !carModel) {
      setError("Select vehicle make and model.");
      return;
    }
    const y = Number(vehicleYear);
    if (!Number.isFinite(y)) {
      setError("Select vehicle year.");
      return;
    }
    if (!serviceId) {
      setError("Select a service package from the list, or choose Custom work.");
      return;
    }
    if (isCustomService && serviceDescription.trim().length < 10) {
      setError("Describe the custom service you need (at least one sentence).");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{
        _id: string;
        emailSent?: { customer?: boolean; workshop?: boolean };
        emailError?: string;
      }>("/quote-request", {
        customerName: customerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        vehicleType,
        carMake,
        carModel,
        vehicleYear: y,
        serviceId: isCustomService ? QUOTE_CUSTOM_SERVICE : serviceId,
        serviceDescription: serviceDescription.trim(),
        partsNotes: partsNotes.trim(),
      });
      const data = res.data;
      const emailIssue =
        data.emailSent && data.emailSent.customer === false ? "?emailIssue=1" : "";
      router.push(`/quote/confirmation/${data._id}${emailIssue}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message || "Could not submit. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4 sm:p-6 md:p-8">
      <div className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Your contact</h2>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Full name</span>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Email</span>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Phone</span>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </label>
        </section>

        <section className="space-y-4 border-t border-black/5 pt-6 dark:border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Vehicle details</h2>
            <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">
              Same lists as online booking — helps us price parts and labour accurately.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Body type</span>
            <select
              className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as typeof vehicleType)}
            >
              <option value="Hatchback">Hatchback</option>
              <option value="Sedan">Sedan</option>
              <option value="SUV">SUV</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Company / make</span>
            <select
              className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
              value={carMake}
              onChange={(e) => {
                const make = e.target.value;
                setCarMake(make);
                setCarModel("");
              }}
            >
              <option value="">Select make</option>
              {VEHICLE_MAKE_OPTIONS.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Model</span>
            <select
              className="w-full rounded-xl border border-gray-300 bg-white p-3 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800"
              value={carModel}
              disabled={!carMake}
              onChange={(e) => setCarModel(e.target.value)}
            >
              <option value="">{carMake ? "Select model" : "Select make first"}</option>
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Year</span>
            <select
              className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
              value={vehicleYear}
              onChange={(e) => setVehicleYear(e.target.value)}
            >
              <option value="">Select year</option>
              {VEHICLE_YEARS.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="space-y-4 border-t border-black/5 pt-6 dark:border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Service</h2>
            <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">
              Pick a published package from our workshop, or &quot;Custom work&quot; if it&apos;s not listed.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
              Service package
            </span>
            <select
              className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">Select a service…</option>
              {services.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                  {s.basePrice != null ? ` — from ₹${s.basePrice}` : ""}
                </option>
              ))}
              <option value={QUOTE_CUSTOM_SERVICE}>Custom work — not listed above</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
              {isCustomService ? "Describe the service you need" : "Additional details (optional)"}
            </span>
            <textarea
              className="min-h-[100px] w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
              placeholder={
                isCustomService
                  ? "Explain the repair or work required in detail…"
                  : "Symptoms, add-ons, or anything else we should know…"
              }
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
            />
          </label>
        </section>

        <section className="space-y-4 border-t border-black/5 pt-6 dark:border-white/10">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
              Parts you think need replacing (optional)
            </span>
            <textarea
              className="min-h-[88px] w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
              placeholder="e.g. front brake pads, battery, timing belt…"
              value={partsNotes}
              onChange={(e) => setPartsNotes(e.target.value)}
            />
          </label>
        </section>
      </div>
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary min-h-11 px-6 disabled:opacity-50"
          disabled={loading}
          onClick={() => void submit()}
        >
          {loading ? "Sending…" : "Request quotation"}
        </button>
        <Link href="/quote/track" className="text-sm font-medium text-amber-800 underline dark:text-amber-400">
          Track an existing quote
        </Link>
      </div>
    </div>
  );
}
