"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Horizontal tab bar for the signed-in /account dashboard.
 * Desktop: pills with generous spacing. Mobile: horizontal scroll.
 *
 * URL-driven (each tab is its own route), so deep-linking and back/
 * forward all behave naturally.
 */
const TABS = [
  { label: "Profile", href: "/account/profile" },
  { label: "Security", href: "/account/security" },
  { label: "Data", href: "/account/data" },
  { label: "Sessions", href: "/account/sessions" },
];

export function AccountTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="Account sections"
      className="border-b border-paper/10 mb-8"
    >
      <ul className="flex gap-1 overflow-x-auto scrollbar-thin">
        {TABS.map((t) => {
          const active =
            pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block px-4 py-2.5 font-sans text-[13.5px] font-medium transition-colors",
                  "border-b-2 -mb-px",
                  active
                    ? "text-paper border-gold"
                    : "text-paper/60 hover:text-paper border-transparent",
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
