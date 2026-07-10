"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

/**
 * Console navigation, host-dashboard style: a quiet left rail on
 * desktop, horizontal pills on mobile. Both render from the one list so
 * the console can't grow a page the nav doesn't know about.
 */
const SECTIONS: { label: string; href: string; exact?: boolean }[] = [
  { label: "Overview", href: "/shop/seller", exact: true },
  { label: "Orders", href: "/shop/seller/orders" },
  { label: "Messages", href: "/shop/seller/messages" },
  { label: "Listings", href: "/shop/seller/listings" },
  { label: "Earnings", href: "/shop/seller/earnings" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
}

export function SellerNav({ storeName }: { storeName: string }) {
  const pathname = usePathname() ?? "";

  return (
    <>
      {/* Mobile: sticky pill rail, same register as ShopSubTabs. */}
      <nav
        aria-label="Seller console sections"
        className="md:hidden sticky top-12 z-20 -mx-5 bg-night/92 px-3 py-2 backdrop-blur border-b border-white/8"
      >
        <ul className="flex gap-1 overflow-x-auto scrollbar-thin">
          {SECTIONS.map((s) => {
            const active = isActive(pathname, s.href, s.exact);
            return (
              <li key={s.href} className="shrink-0">
                <Link
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-block rounded-pill px-3.5 py-1.5 font-sans text-detail font-medium transition-colors",
                    active
                      ? "bg-gold text-night"
                      : "text-paper/70 hover:text-paper border border-paper/15 bg-paper/[0.03]",
                  )}
                >
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop: left rail. */}
      <nav
        aria-label="Seller console sections"
        className="hidden md:block w-[220px] shrink-0"
      >
        <p className="px-4 font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/50">
          {storeName}
        </p>
        <ul className="mt-3 space-y-1">
          {SECTIONS.map((s) => {
            const active = isActive(pathname, s.href, s.exact);
            return (
              <li key={s.href}>
                <Link
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-4 py-2.5 font-sans text-ui font-medium transition-colors",
                    active
                      ? "bg-paper/[0.07] text-paper"
                      : "text-paper/65 hover:bg-paper/[0.04] hover:text-paper",
                  )}
                >
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href="/shop"
          className="mt-6 block px-4 font-sans text-detail text-paper/55 hover:text-paper"
        >
          ← Back to the shop
        </Link>
      </nav>
    </>
  );
}
