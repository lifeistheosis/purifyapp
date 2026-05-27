"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Sticky sub-tab strip rendered on `< md` under the page header inside
 * the Prayers section. Horizontal-scrollable on narrow phones so all
 * five labels remain reachable without wrapping.
 *
 * Hidden on desktop, the existing AppNav + page heading carry that
 * register on `md+`.
 */
const TABS: { label: string; href: string }[] = [
  { label: "Today", href: "/prayers/today" },
  { label: "Morning", href: "/prayers/morning" },
  { label: "Evening", href: "/prayers/evening" },
  { label: "Jesus Prayer", href: "/prayers/learning/jesus-prayer" },
  { label: "Personal", href: "/prayers/personal" },
];

export function PrayersSubTabs() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Prayer sections"
      className="md:hidden sticky top-12 z-20 bg-night/92 backdrop-blur border-b border-white/8"
    >
      <ul className="flex gap-1 overflow-x-auto scrollbar-thin px-3 py-2">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block rounded-pill px-3.5 py-1.5 font-sans text-[13px] font-medium transition-colors",
                  active
                    ? "bg-gold text-night"
                    : "text-paper/70 hover:text-paper border border-paper/15 bg-paper/[0.03]",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
