import { AppNav } from "@/components/nav/AppNav";
import { Footer } from "@/components/layout/Footer";
import { SyncBridge } from "@/components/profile/SyncBridge";
import { PrayerSyncBridge } from "@/components/profile/PrayerSyncBridge";
import { MobileTabBar } from "@/components/nav/MobileTabBar";
import { ScrollToTop } from "@/components/nav/ScrollToTop";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Desktop chrome. Hidden on phones, the MobileTabBar replaces it. */}
      <div className="hidden md:block">
        <AppNav />
      </div>
      <SyncBridge />
      <PrayerSyncBridge />
      {/* safe-pb gives mobile scroll containers room to clear the tab bar
          + iOS home indicator; the utility is a no-op on md+. */}
      <main className="flex-1 safe-pb">{children}</main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileTabBar />
      <ScrollToTop />
      <InstallPrompt />
    </>
  );
}
