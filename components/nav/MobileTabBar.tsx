"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
// Three kept library glyphs, and four bespoke tab glyphs.
//
// The tab set lives under icons/tab/ rather than replacing the library icons,
// because the two have different briefs. A library icon is read alone at
// whatever size its host gives it; a tab icon is read in a row of seven at
// exactly 22px, where what matters is that it is optically the same weight as
// its neighbours and has a silhouette none of them share. Codex, Octogram,
// PrayerRope and Lampada are all still in use elsewhere (Bible index,
// Discover, Reading, PrayersMobile, the calendar's fast-free glyph and the
// mobile headers' donate glyph) and are untouched by this.
import { Sun } from "@/components/ui/icons/Sun";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Church } from "@/components/ui/icons/Church";
import { Evangelion } from "@/components/ui/icons/tab/Evangelion";
import { Klimax } from "@/components/ui/icons/tab/Klimax";
import { Orans } from "@/components/ui/icons/tab/Orans";
import { Pechat } from "@/components/ui/icons/tab/Pechat";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { shopEnabled } from "@/lib/shop/flags";

/**
 * Persistent bottom tab bar on `< md` viewports. Hidden on desktop, which
 * keeps the existing AppNav.
 *
 * Tabs, in the order chosen by the user:
 *   Today  ·  Bible  ·  Discover  ·  Prayers  ·  Shop  ·  You
 * Shop appears only while the marketplace flag is on (it is inside the app now,
 * Beta 1.9); commerce sits after the study surfaces, before the account.
 *
 * Active state is derived from `usePathname()`, with a small precedence
 * table so adjacent routes (e.g. /saints under Discover, /account under
 * You) light up the correct tab.
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

  const TABS: Tab[] = [
    {
      key: "today",
      label: t("nav.today"),
      href: "/",
      Icon: Sun,
      matches: (p) => p === "/" || p === "/prayers/today",
    },
    {
      key: "bible",
      label: t("nav.bible"),
      href: "/bible",
      Icon: Evangelion,
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
      Icon: Orans,
      matches: (p) =>
        (p === "/prayers" || p.startsWith("/prayers/")) && p !== "/prayers/today",
    },
    ...(shopEnabled()
      ? [
          {
            key: "shop",
            label: "Shop",
            href: "/shop",
            Icon: Pechat,
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
      Icon: HaloedHead,
      matches: (p) =>
        p === "/account" ||
        p.startsWith("/account/") ||
        p === "/saved" ||
        p.startsWith("/saved/"),
    },
  ];

  return (
    <nav
      aria-label={t("nav.tabBarLabel")}
      // Full-width wrapper is transparent and ignores pointer events so taps
      // in the side gutters fall through to content; only the floating bar
      // itself is interactive.
      className="md:hidden fixed inset-x-0 bottom-0 z-50 px-3 safe-bottom-pad pointer-events-none"
    >
      <div
        className={cn(
          "pointer-events-auto relative mx-auto mb-1.5 max-w-md overflow-visible",
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
              <li key={key} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
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
                  <Icon
                    size={22}
                    strokeWidth={active ? 2 : undefined}
                    className="transition-[filter] duration-200"
                  />
                  <span className="leading-none">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
