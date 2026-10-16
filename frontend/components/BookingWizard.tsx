"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Service, Slot } from "@/lib/types";
import SlotCalendarPicker from "@/components/SlotCalendarPicker";
import Link from "next/link";
import {
  modelsForMake,
  VEHICLE_MAKE_OPTIONS,
  VEHICLE_YEARS,
} from "@/lib/vehicleCatalog";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

type FormState = {
  serviceId: string;
  vehicleType: "Hatchback" | "Sedan" | "SUV";
  /** Stable reference to the slot row — avoids date/time string mismatches with the API. */
  slotId: string;
  date: string;
  time: string;
  customerName: string;
  phone: string;
  email: string;
  carMake: string;
  carModel: string;
  /** Select value before submit converts to number for API. */
  vehicleYear: string;
  chassisNumber: string;
};

const initialState: FormState = {
  serviceId: "",
  vehicleType: "Hatchback",
  slotId: "",
  date: "",
  time: "",
  customerName: "",
  phone: "",
  email: "",
  carMake: "",
  carModel: "",
  vehicleYear: "",
  chassisNumber: "",
};

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function BookingWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const loadSlots = async () => {
    setSlotsLoading(true);
    try {
      const res = await api.get<Slot[]>("/slots");
      const available = res.data.filter((s) => s.isAvailable);
      setSlots(available);
      setForm((f) => {
        if (f.slotId && !available.some((s) => s._id === f.slotId)) {
          return { ...f, slotId: "", date: "", time: "" };
        }
        return f;
      });
    } catch {
      setError("Could not load time slots. Is the server running?");
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    api
      .get<Service[]>("/services")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const active = list.filter((s) => s.isActive !== false);
        setServices(active);
        const sid = searchParams?.get("serviceId");
        if (sid) {
          const match = active.find((s) => s._id === sid);
          if (match) {
            setForm((f) => ({ ...f, serviceId: sid }));
          } else {
            setError("The selected service is currently unavailable or offline. Please choose another service.");
            setForm((f) => ({ ...f, serviceId: "" }));
          }
        }
      })
      .catch(() => setError("Could not load services."));
  }, [searchParams]);

  useEffect(() => {
    void loadSlots();
  }, []);

  const selectedService = useMemo(
    () => services.find((service) => service._id === form.serviceId),
    [services, form.serviceId]
  );

  const modelOptions = useMemo(() => modelsForMake(form.carMake), [form.carMake]);

  const stepValid = (): boolean => {
    if (step === 1) return Boolean(form.serviceId);
    if (step === 2) {
      const y = Number(form.vehicleYear);
      return (
        Boolean(form.carMake) &&
        Boolean(form.carModel) &&
        Number.isFinite(y) &&
        Boolean(form.vehicleType)
      );
    }
    if (step === 3) return Boolean(form.slotId && form.date && form.time);
    if (step === 4) {
      return (
        Boolean(form.slotId && form.date && form.time) &&
        form.customerName.trim().length > 1 &&
        form.phone.trim().length > 5 &&
        emailOk(form.email) &&
        form.chassisNumber.trim().length >= 6
      );
    }
    return false;
  };

  const goNext = () => {
    if (!stepValid()) {
      setError("Please complete this step before continuing.");
      return;
    }
    setError(null);
    setStep((prev) => Math.min(4, prev + 1));
  };

  const submit = async () => {
    if (!stepValid()) {
      setError("Please fill in all fields correctly.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        vehicleYear: Number(form.vehicleYear),
      };
      const booking = await api.post("/booking", payload);
      router.push(`/booking/confirmation/${booking.data._id}`);
    } catch (e: unknown) {
      const err = e as {
        response?: { status?: number; data?: { message?: string } | string };
      };
      const status = err?.response?.status;
      const data = err?.response?.data;
      const msg =
        typeof data === "string"
          ? data
          : typeof data === "object" && data !== null && "message" in data
            ? data.message
            : undefined;
      if (status === 409) {
        await loadSlots();
      }
      setError(msg || "Booking failed. Try another slot or check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Service", "Vehicle details", "Schedule", "Your details"];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <nav className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-gray-500 dark:text-zinc-500">
          <li>
            <Link href="/" className="font-medium text-amber-800 hover:underline dark:text-amber-400">
              Home
            </Link>
          </li>
          <li aria-hidden className="text-gray-300 dark:text-zinc-600">
            /
          </li>
          <li className="font-medium text-gray-900 dark:text-zinc-100">Booking</li>
        </ol>
        <Link
          href="/booking/track"
          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm transition hover:bg-black/5 dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          Track existing booking
        </Link>
      </nav>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-500">Booking</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Schedule your visit</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">Four quick steps — you&apos;ll get a confirmation when it&apos;s saved.</p>
      </div>
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}
      <div className="card p-4 sm:p-6 md:p-8">
        <div className="mb-6">
          <div className="mb-3 flex gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition ${step >= n ? "bg-zinc-900 dark:bg-white" : "bg-black/10 dark:bg-white/15"}`}
              />
            ))}
          </div>
          <div className="hidden sm:grid sm:grid-cols-4 gap-x-2 text-xs font-medium text-gray-500 dark:text-zinc-500">
            {stepLabels.map((label, i) => (
              <span key={label} className={step === i + 1 ? "text-zinc-900 font-semibold dark:text-white" : ""}>
                {i + 1}. {label}
              </span>
            ))}
          </div>
        </div>
        <p className="mb-6 text-sm font-semibold text-gray-800 dark:text-zinc-200">
          Step {step} of 4: <span className="text-amber-800 dark:text-amber-400">{stepLabels[step - 1]}</span>
        </p>
          {step === 1 && (
            <div className="space-y-3">
              <h2 className="font-semibold">Select Service</h2>
              {services.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-zinc-400">
                  No services available.{" "}
                  <Link href="/services" className="font-medium text-blue-700 underline dark:text-blue-400">
                    Browse services
                  </Link>{" "}
                  or ask an admin to add listings.
                </p>
              ) : (
                <>
                  <select
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
                    value={form.serviceId}
                    onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                  >
                    <option value="">Choose one</option>
                    {services.map((service) => (
                      <option key={service._id} value={service._id}>
                        {service.name} ({service.duration} min)
                      </option>
                    ))}
                  </select>
                  {selectedService && (
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                      From <span className="font-semibold text-gray-900 dark:text-zinc-100">{formatInr(selectedService.basePrice)}</span>
                      {" · "}
                      <span>~{selectedService.duration} min on the hoist</span>
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold">Vehicle details</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
                  Choose body type, brand, model, and year from the lists. Chassis number (from your RC) is entered on the next step.
                </p>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Body type</span>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
                  value={form.vehicleType}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value as FormState["vehicleType"] })}
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
                  value={form.carMake}
                  onChange={(e) => {
                    const make = e.target.value;
                    setForm((f) => ({ ...f, carMake: make, carModel: "" }));
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
                  value={form.carModel}
                  disabled={!form.carMake}
                  onChange={(e) => setForm({ ...form, carModel: e.target.value })}
                >
                  <option value="">{form.carMake ? "Select model" : "Select make first"}</option>
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
                  value={form.vehicleYear}
                  onChange={(e) => setForm({ ...form, vehicleYear: e.target.value })}
                >
                  <option value="">Select year</option>
                  {VEHICLE_YEARS.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Select Date &amp; Time</h2>
                <button
                  type="button"
                  className="text-sm font-medium text-blue-700 underline dark:text-blue-400"
                  onClick={() => void loadSlots()}
                  disabled={slotsLoading}
                >
                  {slotsLoading ? "Refreshing…" : "Refresh slots"}
                </button>
              </div>
              <SlotCalendarPicker
                slots={slots}
                loading={slotsLoading}
                selectedSlotId={form.slotId}
                onSelectSlot={(slot) =>
                  setForm({
                    ...form,
                    slotId: slot._id,
                    date: slot.date,
                    time: slot.time,
                  })
                }
                onClearSlot={() => setForm({ ...form, slotId: "", date: "", time: "" })}
              />
              {selectedService && (
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  Estimated service duration: {selectedService.duration} minutes
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-3">
              <h2 className="font-semibold">Your details</h2>
              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Vehicle (from step 2)</p>
                <p className="mt-2 font-medium text-gray-900 dark:text-zinc-100">
                  {form.carMake} {form.carModel}
                  {form.vehicleYear ? ` · ${form.vehicleYear}` : ""}
                </p>
                <p className="mt-1 text-gray-600 dark:text-zinc-400">{form.vehicleType}</p>
              </div>
              <input
                className="rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
                placeholder="Full name"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                autoComplete="name"
              />
              <input
                className="rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
                placeholder="Phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                autoComplete="tel"
              />
              <input
                className="rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                  Chassis number (as on RC)
                </span>
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  placeholder="Enter chassis number from your registration certificate"
                  value={form.chassisNumber}
                  onChange={(e) => setForm({ ...form, chassisNumber: e.target.value })}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                Mandatory for ordering the correct parts — copy exactly as printed on your RC (usually near engine/chassis details).
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              className="min-h-[44px] w-full sm:w-auto rounded-full border border-black/10 sm:border-transparent px-5 py-2.5 text-sm font-medium hover:bg-black/5 disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10 text-center"
              disabled={step === 1}
              onClick={() => {
                setError(null);
                setStep((prev) => Math.max(1, prev - 1));
              }}
            >
              Back
            </button>
            {step < 4 ? (
              <button
                type="button"
                className="btn-primary min-h-[46px] w-full sm:w-auto px-6 text-sm font-semibold disabled:opacity-40"
                onClick={goNext}
                disabled={!stepValid()}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary min-h-[46px] w-full sm:w-auto px-6 text-sm font-semibold disabled:opacity-50"
                onClick={() => void submit()}
                disabled={loading || !stepValid()}
              >
                {loading ? "Submitting…" : "Confirm booking"}
              </button>
            )}
          </div>
        </div>
    </main>
  );
}
