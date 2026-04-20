import Link from "next/link";
import CustomerFooter from "@/components/CustomerFooter";
import CustomerHeader from "@/components/CustomerHeader";
import { ShopCartProvider } from "@/components/ShopCartProvider";
import { SiteLocationProvider } from "@/components/SiteLocationProvider";
import { SITE_NAME } from "@/lib/site";

export default function NotFound() {
  return (
    <ShopCartProvider>
      <SiteLocationProvider>
        <div className="flex min-h-screen flex-col">
          <CustomerHeader />
          <main className="mx-auto flex flex-1 max-w-lg flex-col justify-center px-4 py-16 text-center">
            <h1 className="text-3xl font-bold">Page not found</h1>
            <p className="mt-2 text-gray-600 dark:text-zinc-400">
              That URL is not part of {SITE_NAME}.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/" className="rounded-full bg-black px-5 py-2 text-sm text-white dark:bg-white dark:text-black">
                Home
              </Link>
              <Link href="/services" className="rounded-full border border-black/15 px-5 py-2 text-sm dark:border-white/20">
                Services
              </Link>
            </div>
          </main>
          <CustomerFooter />
        </div>
      </SiteLocationProvider>
    </ShopCartProvider>
  );
}
