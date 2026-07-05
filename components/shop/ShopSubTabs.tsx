"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Sticky buyer navigation inside the shop section on `< md`, the same
 * register as PrayersSubTabs. Desktop carries the section through the
 * page headers instead. "Saved" is the app-wide /saved surface (product
 * favorites live there beside bookmarks); "Profile" is the account page.
 */
const TABS: { label: string; href: string; exact?: boolean }[] = [
  { label: "Explore", href: "/shop", exact: true },
  { label: "Requests", href: "/shop/requests" },
  { label: "Orders", href: "/shop/orders" },
  { label: "Saved", href: "/saved" },
  { label: "Profile", href: "/account" },
];

export function ShopSubTabs() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Shop sections"
      className="md:hidden sticky top-12 z-20 bg-night/92 backdrop-blur border-b border-white/8"
    >
      <ul className="flex gap-1 overflow-x-auto scrollbar-thin px-3 py-2">
        {TABS.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block rounded-pill px-3.5 py-1.5 font-sans text-detail font-medium transition-colors",
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
