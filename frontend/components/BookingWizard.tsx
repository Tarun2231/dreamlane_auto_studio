"use client";

/* eslint-disable react-hooks/set-state-in-effect -- initial data load + URL prefill need effects */
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Service, Slot } from "@/lib/types";
import Link from "next/link";

type FormState = {
  serviceId: string;
  vehicleType: "Hatchback" | "Sedan" | "SUV";
  date: string;
  time: string;
  customerName: string;
  phone: string;
  email: string;
  carModel: string;
};

const initialState: FormState = {
  serviceId: "",
  vehicleType: "Hatchback",
  date: "",
  time: "",
  customerName: "",
  phone: "",
  email: "",
  carModel: "",
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
      setSlots(res.data.filter((s) => s.isAvailable));
    } catch {
      setError("Could not load time slots. Is the server running?");
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    api
      .get<Service[]>("/services")
      .then((res) => setServices(res.data))
      .catch(() => setError("Could not load services."));
  }, []);

  useEffect(() => {
    void loadSlots();
  }, []);

  useEffect(() => {
    const sid = searchParams.get("serviceId");
    if (sid) {
      setForm((f) => ({ ...f, serviceId: sid }));
    }
  }, [searchParams]);

  const selectedService = useMemo(
    () => services.find((service) => service._id === form.serviceId),
    [services, form.serviceId]
  );

  const stepValid = (): boolean => {
    if (step === 1) return Boolean(form.serviceId);
    if (step === 2) return true;
    if (step === 3) return Boolean(form.date && form.time);
    if (step === 4) {
      return (
        form.customerName.trim().length > 1 &&
        form.phone.trim().length > 5 &&
        emailOk(form.email) &&
        form.carModel.trim().length > 0
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
      const booking = await api.post("/booking", form);
      router.push(`/booking/confirmation/${booking.data._id}`);
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || "Booking failed. Try another slot or check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Service", "Vehicle", "Schedule", "Your info"];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
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
      <div className="card p-6 md:p-8">
        <div className="mb-6">
          <div className="mb-3 flex gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition ${step >= n ? "bg-zinc-900 dark:bg-white" : "bg-black/10 dark:bg-white/15"}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs font-medium text-gray-500 dark:text-zinc-500">
            {stepLabels.map((label, i) => (
              <span key={label} className={step === i + 1 ? "text-zinc-900 dark:text-white" : ""}>
                {i + 1}. {label}
              </span>
            ))}
          </div>
        </div>
        <p className="mb-6 text-sm font-medium text-gray-700 dark:text-zinc-300">
          Step {step} of 4 — {stepLabels[step - 1]}
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
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="font-semibold">Select Vehicle Type</h2>
              <select
                className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value as FormState["vehicleType"] })}
              >
                <option>Hatchback</option>
                <option>Sedan</option>
                <option>SUV</option>
              </select>
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
              <select
                className="w-full rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
                value={`${form.date}|${form.time}`}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    setForm({ ...form, date: "", time: "" });
                    return;
                  }
                  const [date, time] = v.split("|");
                  setForm({ ...form, date, time });
                }}
              >
                <option value="">Choose available slot</option>
                {slots.map((slot) => (
                  <option key={slot._id} value={`${slot.date}|${slot.time}`}>
                    {slot.date} — {slot.time}
                  </option>
                ))}
              </select>
              {slots.length === 0 && !slotsLoading && (
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  No open slots right now. Ask the shop to add availability, then tap Refresh.
                </p>
              )}
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
              <input
                className="rounded-xl border border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-800"
                placeholder="Car model"
                value={form.carModel}
                onChange={(e) => setForm({ ...form, carModel: e.target.value })}
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button
              type="button"
              className="rounded-full px-5 py-2 text-sm hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
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
                className="btn-primary min-h-[40px] px-6 disabled:opacity-40"
                onClick={goNext}
                disabled={!stepValid()}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary min-h-[40px] px-6 disabled:opacity-50"
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
