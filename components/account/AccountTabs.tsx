"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import { User } from "@/components/ui/icons/User";
import { Shield } from "@/components/ui/icons/Shield";
import { Codex } from "@/components/ui/icons/Codex";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Cart } from "@/components/ui/icons/Cart";

/**
 * Horizontal tab bar for the signed-in /account dashboard.
 *
 * URL-driven (each tab is its own route), so deep-linking and back/
 * forward all behave naturally.
 *
 * ── Why the selected tab is a filled shape, not an underline ────────────
 *
 * This row used to be five words over a 2px gold rule. Two things were
 * wrong with it on the surface it actually lives on. The rule reads as a
 * hairline at arm's length, so on a phone the selected section was the
 * hardest thing on the screen to find; and an underline needs the row to
 * sit on a border to be legible at all, which pinned the whole panel to a
 * full-width rule it did not otherwise want.
 *
 * A filled row solves both: the selected tab is a shape rather than an
 * edge, it survives being scrolled half off a narrow screen, and it holds
 * its meaning with the rule gone. The icons are the second half of that.
 * They are not decoration here: five one-word labels with nothing to tell
 * them apart is exactly where a glanceable mark earns its place, and they
 * keep the row findable when the labels are translated into a language
 * whose words are much longer. They stay at 16px so the label leads.
 *
 * `size-*` on the wrapper, not the svg, so a translated label cannot drag
 * an icon out of round.
 */
type Tab = {
  labelKey: string | null;
  href: string;
  Icon: typeof User;
};

const TABS: Tab[] = [
  { labelKey: "account.tabs.profile", href: "/account/profile", Icon: User },
  { labelKey: "account.tabs.security", href: "/account/security", Icon: Shield },
  { labelKey: "account.tabs.data", href: "/account/data", Icon: Codex },
  // A lit lamp per place you are still signed in.
  { labelKey: "account.tabs.sessions", href: "/account/sessions", Icon: Lampada },
];

export function AccountTabs() {
  const { t } = useTranslate();
  const pathname = usePathname() ?? "";
  // Pro-only tab. usePremiumTier caches the last known tier in localStorage
  // and adopts it before paint, so a returning Pro member does not watch the
  // tab appear. Deep-linking as a free member still works: the page itself
  // renders the "what Pro includes" state rather than 404ing.
  const tier = usePremiumTier();
  const tabs: Tab[] =
    eikonBoxEnabled() && tier === "pro"
      ? [...TABS, { labelKey: null, href: "/account/eikon-box", Icon: Cart }]
      : TABS;
  return (
    <nav
      aria-label={t("ui.accountSections")}
      className="border-b border-paper/10 mb-8"
    >
      <ul className="flex gap-1 overflow-x-auto no-scrollbar pb-2 -mb-px">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const { Icon } = tab;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2",
                  "font-sans text-detail font-medium",
                  "transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none",
                  active
                    ? "bg-paper/[0.09] text-paper"
                    : "text-paper/55 hover:text-paper hover:bg-paper/[0.04]",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "shrink-0 size-4",
                    active ? "text-gold" : "text-paper/40",
                  )}
                >
                  <Icon size={16} />
                </span>
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
