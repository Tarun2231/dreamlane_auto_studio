import ServicesGrid from "@/components/ServicesGrid";
import { fetchServerApi } from "@/lib/api";
import { Service } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getServices(): Promise<Service[]> {
  try {
    const res = await fetchServerApi("/services", { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <>
      <div className="border-b border-black/5 bg-gradient-to-b from-zinc-100 to-[var(--background)] dark:border-white/10 dark:from-zinc-900/80 dark:to-[var(--background)]">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Services</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-zinc-400">
            Explore packages and book a slot that fits your day — no phone tag required.
          </p>
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
        {services.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-600 dark:text-zinc-400">No services are live yet.</p>
            <Link href="/" className="mt-5 inline-block text-sm font-semibold text-amber-800 underline dark:text-amber-400">
              Back home
            </Link>
          </div>
        ) : (
          <ServicesGrid services={services} />
        )}
      </main>
    </>
  );
}
