import CustomerFooter from "@/components/CustomerFooter";
import CustomerHeader from "@/components/CustomerHeader";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell flex min-h-screen min-h-[100dvh] flex-col pb-[env(safe-area-inset-bottom)]">
      <CustomerHeader />
      <div className="flex-1">{children}</div>
      <CustomerFooter />
    </div>
  );
}
