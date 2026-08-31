import { AppNav } from "@/components/nav/AppNav";
import { Footer } from "@/components/layout/Footer";
import { SyncBridge } from "@/components/profile/SyncBridge";
import { GiftBridge } from "@/components/gifts/GiftBridge";
import { EikonBoxBridge } from "@/components/eikonBox/EikonBoxBridge";
import { MobileTabBar } from "@/components/nav/MobileTabBar";
import { NativeBackBar } from "@/components/nav/NativeBackBar";
import { ScrollToTop } from "@/components/nav/ScrollToTop";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { AmbienceController } from "@/components/ambience/AmbienceController";
import { WebOnly, NativeOnly } from "@/components/platform/PlatformGate";
import { ContentProvider } from "@/components/content/ContentProvider";
import { UpgradeModalProvider } from "@/components/billing/UpgradeModal";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ContentProvider>
      <UpgradeModalProvider>
      {/* Web header (mobile + desktop). AppNav handles its own responsive
          layout — full nav on desktop, a hamburger on mobile. Hidden in the
          native app, where the bottom tab bar is the navigation.

          data-app-chrome marks each shell element the reader's focus mode
          must hide (html.reader-focus in globals.css). The platform-split
          rewrite of this file dropped these tags, which left the sticky
          header covering the "Exit focus" pill — focus mode looked stuck.
          The `contents` wrappers are layout-neutral; do not remove the
          attribute when restructuring this file. */}
      <div data-app-chrome className="contents">
        <WebOnly>
          <AppNav />
        </WebOnly>
      </div>
      <SyncBridge />
      {/* PrayerSyncBridge is NOT here. It moved to the root layout, because
          Today is app/page.tsx, outside this group: a reader who cold-starts
          onto Today and prays from there never mounted this layout, so their
          prayer history never pushed or pulled. Same reason as RouteExitBridge
          and NowPlayingBar. Do not add a second mount here; installPrayerSync-
          Bridge has a module-level `started` flag and the two teardowns would
          fight over it. */}
      {/* Shows a claimable gift once per app open; renders nothing otherwise. */}
      <GiftBridge />
      {/* Same posture for this month's EIKON Box: Pro members only, once per
          app open, silent for everyone else. */}
      <EikonBoxBridge />
      {/* UpdateBridge is NOT here, for the same reason as PrayerSyncBridge:
          the native app cold-starts onto Today, which is app/page.tsx and
          outside this group, so a reader who opens the app and stays on
          Today would never be told a new build exists. It lives in the root
          layout with the other bridges that have to survive that. */}
      {/* safe-pt / safe-pb are no-ops on the web; inside the native shell
          they clear the status bar (top) and the tab bar + home indicator
          (bottom). */}
      {/* data-route-content: the target of the route-exit fade. It is a
          SIBLING of MobileTabBar below, never an ancestor, so the bar does
          not fade with the content and the selected tab answers a tap
          immediately. See lib/ui/routeTransition.ts. */}
      <main data-route-content className="flex-1 safe-pt safe-pb">
        {/* The way back, on every native screen that is not a tab root and
            does not already carry its own MobileTopBar. It lives INSIDE
            <main>, first child, because that is the position .topbar-safe is
            written for: it cancels this element's .safe-pt with a negative
            margin, which only lands if the bar is inside it. NativeBackBar
            returns null on the routes that must not have it, so this mount is
            unconditional and the rule lives in one place.

            Native only. On the web the browser's own back button already
            does this, and a second chevron under the AppNav is noise. */}
        <div data-app-chrome className="contents">
          <NativeOnly>
            <NativeBackBar />
          </NativeOnly>
        </div>
        {children}
      </main>
      <div data-app-chrome className="contents">
        <WebOnly>
          <Footer />
        </WebOnly>
      </div>
      <div data-app-chrome className="contents">
        <NativeOnly>
          <MobileTabBar />
        </NativeOnly>
      </div>
      <ScrollToTop />
      <AmbienceController />
      <InstallPrompt />
      </UpgradeModalProvider>
    </ContentProvider>
  );
}
