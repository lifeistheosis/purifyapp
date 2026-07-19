"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Sun } from "@/components/ui/icons/Sun";
import { Codex } from "@/components/ui/icons/Codex";
import { Octogram } from "@/components/ui/icons/Octogram";
import { PrayerRope } from "@/components/ui/icons/PrayerRope";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Lampada } from "@/components/ui/icons/Lampada";
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
 */

type Tab = {
  key: string;
  label: string;
  href: string;
  Icon: typeof Sun;
  matches: (p: string) => boolean;
};

// Matches the `gap-1` gutter between tabs; used to keep the sliding
// indicator's geometry exactly in step with the flex cells.
const GAP = 4;

// Module-scoped memory of the last active tab. The bar is mounted in two
// separate layout subtrees — `app/page.tsx` (Today, "/") and the (app)
// group layout (Bible/Discover/Prayers/You) — so crossing that boundary
// REMOUNTS the component. A fresh mount has no prior `left` for CSS to
// transition from, which made the indicator jump on Today<->Bible. By
// remembering the previous index here (it survives remounts within the
// same page session), a remounted bar can render at the OLD slot first and
// then glide to the new one, so the animation is seamless either way.
let lastActiveIndex = 0;

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
      Icon: Codex,
      matches: (p) => p === "/bible" || p.startsWith("/bible/"),
    },
    {
      key: "discover",
      label: t("nav.discover"),
      href: "/discover",
      Icon: Octogram,
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
      Icon: PrayerRope,
      matches: (p) =>
        (p === "/prayers" || p.startsWith("/prayers/")) && p !== "/prayers/today",
    },
    ...(shopEnabled()
      ? [
          {
            key: "shop",
            label: "Shop",
            href: "/shop",
            Icon: Lampada,
            matches: (p: string) => p === "/shop" || p.startsWith("/shop/"),
          } as Tab,
        ]
      : []),
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

  // -1 on routes that belong to no tab (e.g. /pricing, /support). The
  // sliding compartment hides there instead of falsely settling on Today.
  const matchedIndex = TABS.findIndex(({ matches }) => matches(pathname));
  const hasActive = matchedIndex >= 0;
  const activeIndex = hasActive ? matchedIndex : lastActiveIndex;

  // `renderIndex` drives the indicator's position. It starts at the slot
  // the user was last on (which may differ from `activeIndex` right after a
  // cross-subtree remount), so the first paint lands at the OLD slot. A
  // double rAF then advances it to `activeIndex`, giving CSS a real "from"
  // value to transition out of — the indicator always glides, never jumps.
  const [renderIndex, setRenderIndex] = useState(lastActiveIndex);

  useEffect(() => {
    lastActiveIndex = activeIndex;
    if (renderIndex === activeIndex) return;
    // Nested rAF: let the browser paint the current (old) slot once, THEN
    // advance to the target so the transition has a frame to animate from.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setRenderIndex(activeIndex));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [activeIndex, renderIndex]);

  // Geometry for the single sliding highlight. The bar is N equal flex
  // cells separated by the GAP gutter, so one slot is
  //   cell = (100% - (N-1)*gap) / N
  // and slot i starts at i * (cell + gap). Driving `left` off these calc
  // strings keeps the indicator pixel-aligned at any bar width while a CSS
  // transition animates it gliding to the newly selected section.
  const N = TABS.length;
  const cell = `((100% - ${(N - 1) * GAP}px) / ${N})`;
  const slotLeft = `calc(${renderIndex} * (${cell} + ${GAP}px))`;

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
        <ul className="relative flex items-stretch gap-1">
          {/* Sliding compartment: one shared highlight that glides between
              slots instead of popping in/out per tab. Sits behind the links
              (z-0); the links are lifted to z-10. */}
          <span
            aria-hidden
            className={cn(
              "absolute top-0 bottom-0 z-0 rounded-[26px]",
              "border border-white/15 bg-white/[0.08]",
              "transition-[left,opacity] duration-300 ease-out motion-reduce:transition-none",
              hasActive ? "opacity-100" : "opacity-0",
            )}
            style={{ width: `calc(${cell})`, left: slotLeft }}
          />
          {TABS.map(({ key, label, href, Icon, matches }) => {
            const active = matches(pathname);
            return (
              <li key={key} className="relative z-10 flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "tap-press",
                    "h-[58px] flex flex-col items-center justify-center gap-1.5 rounded-[26px]",
                    "font-sans text-caption tracking-[0.01em] transition-colors duration-200",
                    active
                      ? "text-paper font-semibold"
                      : "text-paper/55 hover:text-paper/80 font-medium",
                  )}
                >
                  {/* Active tabs also thicken the stroke: with the color
                      shift and the sliding compartment this gives three
                      selected-state signals, none of them color-only. */}
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
