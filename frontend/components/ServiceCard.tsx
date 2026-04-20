"use client";

import Image from "next/image";
import Link from "next/link";
import { serviceImageIsRemoteHttp, serviceImageUrl } from "@/lib/images";
import { Service } from "@/lib/types";

type ServiceCardProps = {
  service: Service;
  /** Narrow layout for home page horizontal strips */
  variant?: "default" | "strip";
};

export default function ServiceCard({ service, variant = "default" }: ServiceCardProps) {
  const img = serviceImageUrl(service.image);
  const remote = serviceImageIsRemoteHttp(img);
  const strip = variant === "strip";
  return (
    <article
      className={`card group flex flex-col overflow-hidden transition duration-300 ${
        strip
          ? "rounded-3xl border-zinc-200/80 bg-white/95 shadow-sm ring-1 ring-black/[0.03] hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:ring-white/5"
          : "hover:-translate-y-1 hover:shadow-lg"
      }`}
    >
      <Link
        href={`/services/${service._id}`}
        className={`relative block w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 ${strip ? "h-40" : "h-48"}`}
      >
        {remote ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote URLs from admin (any host)
          <img
            src={img}
            alt={service.name}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <Image
            src={img}
            alt={service.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        )}
        <span
          className={`absolute rounded-full bg-black/60 font-medium text-white backdrop-blur-sm ${
            strip ? "bottom-3 left-3 px-2.5 py-1 text-[10px]" : "bottom-3 left-3 px-3 py-1 text-xs"
          }`}
        >
          ~{service.duration} min
        </span>
      </Link>
      <div className={`flex flex-1 flex-col ${strip ? "p-4" : "p-5"}`}>
        <h3 className={strip ? "line-clamp-2 text-[1.35rem] font-semibold leading-tight tracking-tight" : "text-lg font-bold tracking-tight"}>
          {service.name}
        </h3>
        <p
          className={`line-clamp-2 flex-1 leading-relaxed text-gray-600 dark:text-zinc-400 ${
            strip ? "mt-2 text-sm" : "mt-2 text-sm"
          }`}
        >
          {service.description}
        </p>
        <div
          className={`flex flex-wrap items-center gap-2 border-t border-black/5 dark:border-white/10 ${
            strip ? "mt-4 border-black/5 pt-3.5" : "mt-4 gap-3 pt-4"
          }`}
        >
          <Link
            href={`/services/${service._id}`}
            className={strip ? "text-sm font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-400" : "text-sm font-semibold text-amber-800 underline-offset-4 hover:underline dark:text-amber-400"}
          >
            Details
          </Link>
          <Link
            href={`/booking?serviceId=${service._id}`}
            className={
              strip
                ? "rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                : "rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            }
          >
            Book
          </Link>
        </div>
      </div>
    </article>
  );
}
