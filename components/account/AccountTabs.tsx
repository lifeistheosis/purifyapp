"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";

/**
 * Horizontal tab bar for the signed-in /account dashboard.
 * Desktop: pills with generous spacing. Mobile: horizontal scroll.
 *
 * URL-driven (each tab is its own route), so deep-linking and back/
 * forward all behave naturally.
 */
const TABS: { labelKey: string | null; href: string }[] = [
  { labelKey: "account.tabs.profile", href: "/account/profile" },
  { labelKey: "account.tabs.security", href: "/account/security" },
  { labelKey: "account.tabs.data", href: "/account/data" },
  { labelKey: "account.tabs.sessions", href: "/account/sessions" },
];

export function AccountTabs() {
  const { t } = useTranslate();
  const pathname = usePathname() ?? "";
  // Pro-only tab. usePremiumTier caches the last known tier in localStorage
  // and adopts it before paint, so a returning Pro member does not watch the
  // tab appear. Deep-linking as a free member still works: the page itself
  // renders the "what Pro includes" state rather than 404ing.
  const tier = usePremiumTier();
  const tabs =
    eikonBoxEnabled() && tier === "pro"
      ? [...TABS, { labelKey: null, href: "/account/eikon-box" }]
      : TABS;
  return (
    <nav
      aria-label={t("ui.accountSections")}
      className="border-b border-paper/10 mb-8"
    >
      <ul className="flex gap-1 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block px-4 py-2.5 font-sans text-detail font-medium transition-colors",
                  "border-b-2 -mb-px",
                  active
                    ? "text-paper border-gold"
                    : "text-paper/60 hover:text-paper border-transparent",
                )}
              >
                {/* "EIKON Box" is a product name and stays untranslated. */}
                {tab.labelKey ? t(tab.labelKey) : "EIKON Box"}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
