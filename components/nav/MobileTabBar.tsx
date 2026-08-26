"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
// Two kept library glyphs (Today, Community) and five bespoke tab glyphs.
//
// The tab set lives under icons/tab/ rather than replacing the library icons,
// because the two have different briefs. A library icon is read alone at
// whatever size its host gives it; a tab icon is read in a row of seven at
// exactly 22px, where what matters is that it is optically the same weight as
// its neighbours and has a silhouette none of them share. Codex, Octogram,
// PrayerRope, Lampada and HaloedHead are all still in use elsewhere (Bible
// index, Discover, Reading, PrayersMobile, the calendar's fast-free glyph and
// the mobile headers' donate glyph) and are untouched by this.
import { Sun } from "@/components/ui/icons/Sun";
import { Church } from "@/components/ui/icons/Church";
import { BookOpen } from "@/components/ui/icons/tab/BookOpen";
import { Klimax } from "@/components/ui/icons/tab/Klimax";
import { OrthodoxCross } from "@/components/ui/icons/tab/OrthodoxCross";
import { Cart } from "@/components/ui/icons/tab/Cart";
import { Gear } from "@/components/ui/icons/tab/Gear";
import { NotificationsBadge } from "@/components/community/NotificationsInbox";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { haptic } from "@/lib/ui/motion";
import { shopEnabled } from "@/lib/shop/flags";
import { useOverlayOpen } from "@/lib/ui/overlay";
import { beginRouteExit } from "@/lib/ui/routeTransition";

/**
 * Persistent bottom tab bar on `< md` viewports. Hidden on desktop, which
 * keeps the existing AppNav.
 *
 * Tabs, in the order chosen by the user:
 *   Today · Bible · Discover · Prayers · Shop · Community · You
 * Shop appears only while the marketplace flag is on (it is inside the app now,
 * Beta 1.9); commerce sits after the study surfaces, before the account. So
 * this is six tabs by default and seven in the shipped APK, which sets
 * NEXT_PUBLIC_SHOP_ENABLED.
 *
 * Active state is derived from `usePathname()`, with a small precedence
 * table so adjacent routes (e.g. /saints under Discover, /account under
 * You) light up the correct tab. `/prayers/today` used to be carved out of
 * Prayers and handed to Today, back when the in-app tiles pointed at it;
 * they no longer do, and it is a /prayers route, so it lights Prayers.
 *
 * There is deliberately NO sliding highlight behind the active tab. The
 * earlier version glided a rounded compartment between slots, which had two
 * problems. Visually, at seven tabs the cell computes to ~58x58px and a
 * 26px radius turned that compartment into a circle, so it read as a bubble
 * ballooning out of the bar rather than a compartment inside it. Mechanically
 * it animated `left`, which is not compositor-accelerated: the app's most
 * frequent interaction forced a layout every frame for 300ms, on the same
 * main thread that runs React. Removing it also retired the module-scoped
 * `lastActiveIndex` and the nested-rAF dance that existed only to keep that
 * compartment from jumping across the app/page.tsx <-> (app) remount boundary.
 *
 * The selected tab is still signalled three ways, only one of which is
 * colour: text colour, font weight, and icon stroke weight. That keeps the
 * state legible without relying on hue alone.
 */

type Tab = {
  key: string;
  label: string;
  href: string;
  Icon: typeof Sun;
  matches: (p: string) => boolean;
};

export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const { t } = useTranslate();
  // Step aside while a modal sheet is open. This is not cosmetic: the bar was
  // eating taps and hiding text through the sheet.
  //
  // An `(app)` route is wrapped in `.route-fade`, whose animation is declared
  // `both`, so the opacity animation stays in effect forever and the wrapper is
  // a permanent stacking context. Every z-index inside it, including the
  // commentary sheet's z-[60], is therefore scoped to that wrapper and paints
  // BELOW this root-level z-50 bar. Raising the sheet's z-index cannot fix
  // that; only leaving the wrapper or removing the bar can.
  //
  // The visible consequence, reported twice from the Android beta by the same
  // reader (#android-forums, 2026-07-11 and 2026-08-01): the last lines of a
  // Father sat behind the bar, and any collapsed commentary header that
  // scrolled into the bar's 83px band could not be tapped open at all. A
  // bottom-padding bump in July moved the text but left the interception,
  // because padding cannot stop a bar that paints on top from taking the tap.
  //
  // Hiding the bar for the duration also makes the sheet a real modal: an
  // aria-modal dialog should not have live navigation sitting over it.
  const overlayOpen = useOverlayOpen();

  const TABS: Tab[] = [
    {
      key: "today",
      label: t("nav.today"),
      href: "/",
      Icon: Sun,
      matches: (p) => p === "/",
    },
    {
      key: "bible",
      label: t("nav.bible"),
      href: "/bible",
      Icon: BookOpen,
      matches: (p) => p === "/bible" || p.startsWith("/bible/"),
    },
    {
      key: "discover",
      label: t("nav.discover"),
      href: "/discover",
      Icon: Klimax,
      matches: (p) =>
        p === "/discover" ||
        p.startsWith("/discover/") ||
        p === "/reading" ||
        p.startsWith("/reading/") ||
        p === "/saints" ||
        p.startsWith("/saints/") ||
        p === "/councils" ||
        p.startsWith("/councils/") ||
        p === "/topics" ||
        p.startsWith("/topics/") ||
        p === "/theology" ||
        p.startsWith("/theology/") ||
        p === "/apologetics" ||
        p.startsWith("/apologetics/") ||
        p === "/heresies" ||
        p.startsWith("/heresies/") ||
        p === "/calendar" ||
        p.startsWith("/calendar/"),
    },
    {
      key: "prayers",
      label: t("nav.prayers"),
      href: "/prayers",
      Icon: OrthodoxCross,
      matches: (p) => p === "/prayers" || p.startsWith("/prayers/"),
    },
    ...(shopEnabled()
      ? [
          {
            key: "shop",
            // Was the literal "Shop". nav.shop is translated in all 21
            // catalogs and none of them was ever reached, so every non-English
            // reader saw one English word in an otherwise translated bar.
            label: t("nav.shop"),
            href: "/shop",
            Icon: Cart,
            matches: (p: string) => p === "/shop" || p.startsWith("/shop/"),
          } as Tab,
        ]
      : []),
    {
      key: "community",
      label: t("nav.community"),
      href: "/community",
      Icon: Church,
      matches: (p) =>
        p === "/community" ||
        p.startsWith("/community/") ||
        p === "/campaigns" ||
        p.startsWith("/campaigns/"),
    },
    {
      key: "you",
      label: t("nav.you"),
      href: "/account",
      Icon: Gear,
      matches: (p) =>
        p === "/account" ||
        p.startsWith("/account/") ||
        p === "/saved" ||
        p.startsWith("/saved/") ||
        p === "/settings",
    },
  ];

  return (
    <nav
      aria-label={t("nav.tabBarLabel")}
      // Hidden from assistive tech too while a sheet is open, for the same
      // reason it is hidden visually: it is outside the open dialog.
      aria-hidden={overlayOpen || undefined}
      // Full-width wrapper is transparent and ignores pointer events so taps
      // in the side gutters fall through to content; only the floating bar
      // itself is interactive.
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-50 px-3 safe-bottom-pad pointer-events-none",
        // Faded rather than unmounted: the sheet slides up over 200ms, and a
        // bar that blinks out instantly is visible in the gap before the sheet
        // covers it. Matching durations makes the handoff read as one motion.
        "transition-opacity duration-200",
        overlayOpen && "opacity-0",
      )}
    >
      <div
        className={cn(
          "relative mx-auto mb-1.5 max-w-md overflow-visible",
          // The tap interception lives here, on the only part of the bar that
          // is interactive, so this is what has to be switched off.
          overlayOpen ? "pointer-events-none" : "pointer-events-auto",
          // Grounded bar: a solid elevated surface (no glassy blur or sheen),
          // a single hairline border, and a restrained shadow so it reads as a
          // quiet raised bar rather than a floating glass pill.
          "rounded-3xl border border-white/10 bg-night-soft",
          "shadow-[0_4px_18px_rgba(0,0,0,0.4)] px-2 py-2",
        )}
      >
        <ul className="flex items-stretch gap-1">
          {TABS.map(({ key, label, href, Icon, matches }) => {
            const active = matches(pathname);
            return (
              // min-w-0: flex-1 is `flex: 1 1 0%`, but a flex item's
              // min-width defaults to auto, so without this the cell
              // refuses to shrink below its label's min-content width and
              // the bar runs off the screen. It did, in Greek, French,
              // Romanian and Russian.
              <li key={key} className="flex-1 min-w-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  // A tick on selection, and only on a real change of tab.
                  // Firing it when you re-tap the tab you are already on makes
                  // the bar feel noisy rather than responsive. Best-effort by
                  // design: iOS WKWebView has no navigator.vibrate, so this is
                  // never the only feedback a tap gives.
                  //
                  // The exit fade starts here, in the same tick as the tap and
                  // before React schedules the navigation, so the outgoing
                  // screen begins leaving while the destination is still being
                  // rendered. It fades `[data-route-content]`, which is a
                  // sibling of this bar, so the bar itself never dims and the
                  // selected state answers instantly. Guarded by the same
                  // `!active` check: re-tapping the current tab navigates
                  // nowhere, and fading the screen for it would be a flicker
                  // with no destination. See lib/ui/routeTransition.ts.
                  onClick={() => {
                    if (!active) {
                      haptic("light");
                      beginRouteExit();
                    }
                  }}
                  className={cn(
                    "tap-press",
                    // rounded-2xl, not the old rounded-[26px]: with no
                    // compartment behind it the radius now only shapes the
                    // focus ring, and 26px on a 58px-square cell drew a circle.
                    "h-[58px] flex flex-col items-center justify-center gap-1.5 rounded-2xl",
                    "font-sans text-caption tracking-[0.01em] transition-colors duration-200",
                    active
                      ? "text-paper font-semibold"
                      : "text-paper/55 hover:text-paper/80 font-medium",
                  )}
                >
                  {/* Active tabs also thicken the stroke. With the colour
                      shift and the heavier label that is three selected-state
                      signals, and two of the three are not colour. Every tab
                      glyph is drawn so its interior stays open at 2.0. */}
                  {/* `key` flips with the active state so React remounts the
                      glyph and the pop replays on every selection. Without it
                      the animation only fires once per mount. */}
                  {/* Relative so the unread dot can sit on the glyph. */}
                  <span className="relative inline-flex">
                    <Icon
                      key={active ? "on" : "off"}
                      size={22}
                      strokeWidth={active ? 2 : undefined}
                      className={cn(active && "tab-pop")}
                    />
                    {key === "community" ? <NotificationsBadge /> : null}
                  </span>
                  {/* truncate, not wrap: a two-line label would change the
                      bar's height on one locale and not another. The full
                      word is still on the destination's own header. */}
                  <span className="block max-w-full truncate leading-none">
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
