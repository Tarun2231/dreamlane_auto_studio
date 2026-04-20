import Image from "next/image";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { serviceImageIsRemoteHttp, serviceImageUrl } from "@/lib/images";
import { Service } from "@/lib/types";

export default async function ServiceDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${API_BASE}/services/${id}`, { cache: "no-store" });
  if (!res.ok) {
    return (
      <main className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Service not found</h1>
        <p className="mt-2 text-gray-600 dark:text-zinc-400">This service may have been removed.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/services" className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black">
            All services
          </Link>
          <Link href="/" className="rounded-full border border-black/15 px-5 py-2.5 text-sm dark:border-white/20">
            Home
          </Link>
        </div>
      </main>
    );
  }
  const service: Service = await res.json();
  const img = serviceImageUrl(service.image);
  const remoteImg = serviceImageIsRemoteHttp(img);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14">
      <div className="card overflow-hidden shadow-lg">
        <div className="relative h-64 bg-zinc-200 md:h-80 dark:bg-zinc-800">
          {remoteImg ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote URLs from admin (any host)
            <img src={img} alt={service.name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Image src={img} alt={service.name} fill className="object-cover" sizes="100vw" priority />
          )}
          <span className="absolute bottom-4 left-4 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            ~{service.duration} min
          </span>
        </div>
        <div className="space-y-4 p-6 md:p-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{service.name}</h1>
          <p className="leading-relaxed text-gray-600 dark:text-zinc-400">{service.description}</p>
          <p className="text-sm text-gray-500 dark:text-zinc-500">Typical duration: {service.duration} minutes</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={`/booking?serviceId=${service._id}`} className="btn-primary">
              Book this service
            </Link>
            <Link href="/services" className="btn-secondary">
              Back to list
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
