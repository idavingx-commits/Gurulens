import { MobileNav } from "@/components/layout/MobileNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { WhatsAppChannelPopup } from "@/components/layout/WhatsAppChannelPopup";
import { getCurrentUser } from "@/lib/auth";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <div className="aurora flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1 pb-24 lg:pb-0">{children}</main>
      <SiteFooter />
      <MobileNav role={user?.role ?? null} />
      <WhatsAppChannelPopup />
    </div>
  );
}
