"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Sticky sub-tab strip rendered on `< md` under the page header inside
 * the Prayers section. Horizontal-scrollable on narrow phones so all
 * five labels remain reachable without wrapping.
 *
 * Hidden on desktop, the existing AppNav + page heading carry that
 * register on `md+`.
 */
const TABS: { key: string; href: string }[] = [
  { key: "today", href: "/prayers/today" },
  { key: "morning", href: "/prayers/morning" },
  { key: "evening", href: "/prayers/evening" },
  { key: "jesusPrayer", href: "/prayers/learning/jesus-prayer" },
  { key: "personal", href: "/prayers/personal" },
];

export function PrayersSubTabs() {
  const pathname = usePathname() ?? "";
  const { t } = useTranslate();

  return (
    <nav
      aria-label={t("prayers.tabs.ariaLabel")}
      className="md:hidden sticky top-12 z-20 bg-night/92 backdrop-blur border-b border-white/8"
    >
      <ul className="flex gap-1 overflow-x-auto scrollbar-thin px-3 py-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block rounded-pill px-3.5 py-1.5 font-sans text-detail font-medium transition-colors",
                  active
                    ? "bg-gold text-night"
                    : "text-paper/70 hover:text-paper border border-paper/15 bg-paper/[0.03]",
                )}
              >
                {t(`prayers.tabs.${tab.key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
