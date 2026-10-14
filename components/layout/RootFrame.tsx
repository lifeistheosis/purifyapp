"use client";

// Everything the root layout mounts around a page, as ONE client component.
//
// WHY ONE. Each client component a server layout renders is named in the
// page's payload, on a line of its own with the list of script files it
// needs, about 350 bytes a line. The root layout rendered twenty-two of
// them, and the root layout is part of every page. In the apps' export that
// is 1,916 pages, each carrying those lines twice (its index.txt and its
// __next._index.txt): about 30 MB of the bundle, and every one of them read
// again each time the app looks ahead to a screen. Rendered from here, the
// same twenty-two components cost a page one line.
//
// Nothing about them changed in the move: the same components, in the same
// order, around the same page. The reasons each one is here, and not in the
// (app) layout, came with them. app/layout.tsx keeps what only a server can
// do: the fonts, the reader's language, the pre-paint scripts.
//
// lib/build/__tests__/rootFrame.test.ts holds the layout to rendering this
// and nothing else of its own.

import type { ReactNode } from "react";

import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { DesktopPresenceBridge } from "@/components/desktop/DesktopPresenceBridge";
import { DiscordFirstRun } from "@/components/desktop/DiscordFirstRun";
import { LocaleBootstrap } from "@/components/i18n/LocaleBootstrap";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { AppNudge } from "@/components/marketing/AppNudge";
import { NativeBridge } from "@/components/native/NativeBridge";
import { PackBridge } from "@/components/native/PackBridge";
import { PressToCopy } from "@/components/native/PressToCopy";
import { ShortcutListener } from "@/components/native/ShortcutListener";
import { WidgetBridgeSync } from "@/components/native/WidgetBridgeSync";
import { RouteExitBridge } from "@/components/nav/RouteExitBridge";
import { ScrollResetBridge } from "@/components/nav/ScrollResetBridge";
import { FirstRunGate } from "@/components/onboarding/FirstRunGate";
import { NowPlayingBar } from "@/components/prayers/NowPlayingBar";
import { PrayerSyncBridge } from "@/components/profile/PrayerSyncBridge";
import { ProfilePrefsBridge } from "@/components/profile/ProfilePrefsBridge";
import { PushHealBridge } from "@/components/push/PushHealBridge";
import { CommandPaletteMount } from "@/components/search/CommandPaletteMount";
import { StreakSavedHost } from "@/components/streak/StreakSavedHost";
import { AppThemeController } from "@/components/theme/AppThemeController";
import { InputModality } from "@/components/ui/InputModality";
import { MotionRoot } from "@/components/ui/MotionRoot";
import { UpdateBridge } from "@/components/update/UpdateBridge";
import type { LocaleCode } from "@/lib/i18n/locales";

export function RootFrame({
  locale,
  messages,
  catechismAvailable,
  children,
}: {
  locale: LocaleCode;
  /** Omitted for English, whose catalog rides in the bundle (MessagesProvider). */
  messages?: Record<string, string>;
  /** Whether the question bank holds anything, which only the server can say. */
  catechismAvailable: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <MessagesProvider locale={locale} messages={messages}>
        <AppThemeController />
        <LocaleBootstrap />
        {/* Here, for the same reason as NowPlayingBar below: Today sits
            outside the (app) group, so a bridge mounted in (app)/template.tsx
            would never clear the exit fade on a tap into Today. */}
        <RouteExitBridge />
        {/* A page opened by going forward starts at its top and is held there
            while it arrives (lib/ui/scrollReset.ts). Here for the reason
            above. Renders nothing. */}
        <ScrollResetBridge />
        {/* Here, for the same reason. Today is app/page.tsx, outside the
            (app) group, and Today is where a reader prays the morning rule
            from. Mounted in (app)/layout.tsx this bridge never ran for them,
            so their prayer history was written locally and never pushed or
            pulled. */}
        <PrayerSyncBridge />
        {/* And for the same reason: a browser that allowed reminders before
            2026-10-04 has no subscription behind the permission
            (lib/push/vapid.ts), and the reader who opens Purify, prays and
            leaves is who it was for. Renders nothing, and does nothing in the
            phone apps. */}
        <PushHealBridge />
        {/* Same reason again: onboarding runs over Today, so the reader who
            states their interests and then signs in may never mount the (app)
            layout. */}
        <ProfilePrefsBridge />
        {/* And again: the app opens on Today, so an update prompt mounted in
            the (app) layout would never reach the reader who opens Purify,
            prays, and closes it, which is most of them. Renders nothing on
            the web, and nothing on native until lib/appUpdate/release.ts
            declares a versionCode above the installed one. */}
        <UpdateBridge />
        {/* Here for the same reason as the bridges above: the desktop app
            opens on Today, and a reader's Discord status should follow them
            from there. Renders nothing, and does nothing outside the desktop
            app or before the reader turns Discord status on in Settings. */}
        <DesktopPresenceBridge />
        <DiscordFirstRun />
        <InputModality />
        {/* Keeps data-motion current after the pre-paint script, runs the
            phone speed check, and in a browser that asked for calm says so
            once. */}
        <MotionRoot />
        {children}
        {/* Here, not in (app)/layout.tsx. Today is app/page.tsx, outside the
            (app) group, so a bar mounted there would unmount on every Today
            tap, which is exactly when a reader walks away from the player.
            Renders nothing until something is loaded. */}
        <NowPlayingBar />
        {/* "It's okay. We got you this time.": the one moment a hidden streak
            save shows itself, on whatever page Purify opens to. Here for the
            reason above. Renders nothing until a save has held a day. */}
        <StreakSavedHost />
        {/* And once more. This was in (app)/layout.tsx, so the palette did
            not exist on Today, which is the app's front door and the screen a
            phone reader returns to. Renders nothing until it is opened, and
            fetches the corpus only on that first open. */}
        <CommandPaletteMount />
        <FirstRunGate catechismAvailable={catechismAvailable} />
        {/* The mobile website: "Purify is better in the app", once per visit. */}
        <AppNudge />
        {/* Purify's own hold-to-copy. In the phone apps the system's text
            selection is off (globals.css, "The apps select nothing by
            themselves"), and a hold on any text without tools of its own
            offers Copy here. Inside the provider because the pill speaks the
            reader's language; renders nothing until a hold, and does nothing
            in a browser. */}
        <PressToCopy />
        {/* What the home screen widgets show (lib/widget). Inside the
            provider, as they speak the reader's language; renders nothing. */}
        <WidgetBridgeSync />
      </MessagesProvider>
      <AnalyticsTracker />
      <NativeBridge />
      {/* The app icon's shortcuts: a reader holds the icon on the home screen
          and taps Morning prayers, Today's reading or Continue reading, and
          this takes the app to that screen. Here because the app opens on
          Today, which is outside the (app) group. Renders nothing, and does
          nothing in a browser. */}
      <ShortcutListener />
      {/* New content from the website without a store build (lib/packs):
          the chosen verses ahead and the board message. Here because the app
          opens on Today, outside the (app) group. Renders nothing, and does
          nothing in a browser. */}
      <PackBridge />
    </>
  );
}
