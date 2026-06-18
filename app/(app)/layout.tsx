import { AppNav } from "@/components/nav/AppNav";
import { Footer } from "@/components/layout/Footer";
import { SyncBridge } from "@/components/profile/SyncBridge";
import { PrayerSyncBridge } from "@/components/profile/PrayerSyncBridge";
import { MobileTabBar } from "@/components/nav/MobileTabBar";
import { ScrollToTop } from "@/components/nav/ScrollToTop";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { AmbienceController } from "@/components/ambience/AmbienceController";
import { CommandPaletteMount } from "@/components/search/CommandPaletteMount";
import { WebOnly, NativeOnly } from "@/components/platform/PlatformGate";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Web header (mobile + desktop). AppNav handles its own responsive
          layout — full nav on desktop, a hamburger on mobile. Hidden in the
          native app, where the bottom tab bar is the navigation. */}
      <WebOnly>
        <AppNav />
      </WebOnly>
      <SyncBridge />
      <PrayerSyncBridge />
      {/* safe-pt / safe-pb are no-ops on the web; inside the native shell
          they clear the status bar (top) and the tab bar + home indicator
          (bottom). */}
      <main className="flex-1 safe-pt safe-pb">{children}</main>
      <WebOnly>
        <Footer />
      </WebOnly>
      <NativeOnly>
        <MobileTabBar />
      </NativeOnly>
      <ScrollToTop />
      <CommandPaletteMount />
      <AmbienceController />
      <InstallPrompt />
    </>
  );
}
