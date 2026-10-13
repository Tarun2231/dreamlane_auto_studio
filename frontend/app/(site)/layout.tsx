import CustomerFooter from "@/components/CustomerFooter";
import CustomerHeader from "@/components/CustomerHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ShopCartProvider } from "@/components/ShopCartProvider";
import { SiteLocationProvider } from "@/components/SiteLocationProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShopCartProvider>
      <SiteLocationProvider>
        <div className="site-shell flex min-h-screen min-h-[100dvh] flex-col pb-[env(safe-area-inset-bottom)]">
          <CustomerHeader />
          <div className="flex-1 pb-16 md:pb-0">{children}</div>
          <CustomerFooter />
          <MobileBottomNav />
        </div>
      </SiteLocationProvider>
    </ShopCartProvider>
  );
}
