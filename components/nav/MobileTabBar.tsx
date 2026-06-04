"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Sun } from "@/components/ui/icons/Sun";
import { Codex } from "@/components/ui/icons/Codex";
import { Octogram } from "@/components/ui/icons/Octogram";
import { PrayerRope } from "@/components/ui/icons/PrayerRope";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Persistent bottom tab bar on `< md` viewports. Hidden on desktop, which
 * keeps the existing AppNav.
 *
 * Five tabs, in the order chosen by the user:
 *   Today  ·  Bible  ·  Discover  ·  Prayers  ·  You
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

// The mobile nav keeps the original signature gold for its active state
// (hardcoded here, independent of the now-neutral `--color-gold` token) so
// the live tab reads as a warm highlight against the dark glass bar.
const ACCENT = "#e0a82e";

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
        p === "/saints" ||
        p.startsWith("/saints/") ||
        p === "/councils" ||
        p.startsWith("/councils/") ||
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
      aria-label="Primary"
      // Full-width wrapper is transparent and ignores pointer events so taps
      // in the side gutters fall through to content; only the floating bar
      // itself is interactive.
      className="md:hidden fixed inset-x-0 bottom-0 z-50 px-3 safe-bottom-pad pointer-events-none"
    >
      <div
        className={cn(
          "pointer-events-auto relative mx-auto mb-2 max-w-md overflow-visible",
          // Floating stadium bar: glass dark surface, hairline border, a
          // soft drop shadow lifting it off the content, and a faint top
          // sheen so the panel reads as raised.
          "rounded-[34px] border border-white/10 bg-night/92 backdrop-blur-xl",
          "shadow-[0_10px_40px_rgba(0,0,0,0.55)] px-2 py-2",
        )}
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.012))",
        }}
      >
        <ul className="flex items-stretch gap-1">
          {TABS.map(({ key, label, href, Icon, matches }) => {
            const active = matches(pathname);
            return (
              <li key={key} className="flex-1 relative">
                {/* Active indicator: a short gold pill seated on the bar's
                    top edge, centered over the live tab. */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-1/2 top-[-9px] -translate-x-1/2 h-[5px] w-9 rounded-full"
                    style={{
                      backgroundColor: ACCENT,
                      boxShadow: `0 0 12px ${ACCENT}88`,
                    }}
                  />
                )}
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "h-[58px] flex flex-col items-center justify-center gap-1.5 rounded-[26px]",
                    "font-sans text-eyebrow tracking-[0.01em] transition-colors duration-150",
                    active
                      ? // Highlighted compartment around the live tab.
                        "border border-white/12 bg-white/[0.05] font-semibold"
                      : "border border-transparent text-paper/45 hover:text-paper/70 font-medium",
                  )}
                  style={active ? { color: ACCENT } : undefined}
                >
                  <Icon
                    size={22}
                    style={
                      active
                        ? { filter: `drop-shadow(0 0 7px ${ACCENT}66)` }
                        : undefined
                    }
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
