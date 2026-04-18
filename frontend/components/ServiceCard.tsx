import Image from "next/image";
import Link from "next/link";
import { serviceImageUrl } from "@/lib/images";
import { Service } from "@/lib/types";

export default function ServiceCard({ service }: { service: Service }) {
  const img = serviceImageUrl(service.image);
  return (
    <article className="card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/services/${service._id}`} className="relative block h-48 w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
        <Image
          src={img}
          alt={service.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          ~{service.duration} min
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold tracking-tight">{service.name}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{service.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-black/5 pt-4 dark:border-white/10">
          <Link
            href={`/services/${service._id}`}
            className="text-sm font-semibold text-amber-800 underline-offset-4 hover:underline dark:text-amber-400"
          >
            Details
          </Link>
          <Link
            href={`/booking?serviceId=${service._id}`}
            className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Book
          </Link>
        </div>
      </div>
    </article>
  );
}
