"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Sun } from "@/components/ui/icons/Sun";
import { Book } from "@/components/ui/icons/Book";
import { Compass } from "@/components/ui/icons/Compass";
import { Hands } from "@/components/ui/icons/Hands";
import { User } from "@/components/ui/icons/User";

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
  label: string;
  href: string;
  Icon: typeof Sun;
  matches: (p: string) => boolean;
};

const TABS: Tab[] = [
  {
    label: "Today",
    href: "/",
    Icon: Sun,
    // Today owns the bare home + the canonical /prayers/today surface.
    matches: (p) => p === "/" || p === "/prayers/today",
  },
  {
    label: "Bible",
    href: "/bible",
    Icon: Book,
    matches: (p) => p === "/bible" || p.startsWith("/bible/"),
  },
  {
    label: "Discover",
    href: "/discover",
    Icon: Compass,
    // Hub for the wider library: saints, councils, calendar, fasts.
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
    label: "Prayers",
    href: "/prayers",
    Icon: Hands,
    // Prayers tab covers everything in /prayers EXCEPT /prayers/today (that
    // belongs to the Today tab so the home hero stays the primary surface).
    matches: (p) =>
      (p === "/prayers" || p.startsWith("/prayers/")) && p !== "/prayers/today",
  },
  {
    label: "You",
    href: "/account",
    Icon: User,
    matches: (p) =>
      p === "/account" ||
      p.startsWith("/account/") ||
      p === "/saved" ||
      p.startsWith("/saved/"),
  },
];

export function MobileTabBar() {
  const pathname = usePathname() ?? "/";

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
        {TABS.map(({ label, href, Icon, matches }) => {
          const active = matches(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "h-full flex flex-col items-center justify-center gap-1 px-1",
                  "font-sans text-[10.5px] font-medium tracking-[0.02em]",
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
