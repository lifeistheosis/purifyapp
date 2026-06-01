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
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-50",
        // Glass dark surface with a hairline at the top. backdrop-blur keeps
        // body content faintly readable behind the bar on scroll.
        "bg-night/92 backdrop-blur border-t border-white/10",
        // env(safe-area-inset-bottom) keeps the tab row clear of the iOS
        // home indicator; the row itself stays var(--tab-bar-h) tall.
        "safe-bottom-pad",
      )}
    >
      <ul className="flex items-stretch justify-around h-[var(--tab-bar-h)] px-1">
        {TABS.map(({ key, label, href, Icon, matches }) => {
          const active = matches(pathname);
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "h-full flex flex-col items-center justify-center gap-1 px-1",
                  "font-sans text-eyebrow font-medium tracking-[0.02em]",
                  "transition-colors duration-150",
                  active
                    ? "text-gold"
                    : "text-paper/55 hover:text-paper/85",
                )}
              >
                {/* Soft gold halo behind the active glyph so the row
                    reads as filled, like the Hallow tab bar. */}
                <span
                  className={cn(
                    "inline-flex items-center justify-center h-8 w-10 rounded-pill transition-colors",
                    active ? "bg-gold/12" : "bg-transparent",
                  )}
                >
                  <Icon size={22} />
                </span>
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
