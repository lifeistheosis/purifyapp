"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ComingSoonCTA } from "@/components/marketing/ComingSoonCTA";
import { useScrolled } from "@/lib/useScrolled";

const NAV = [
  { label: "Bible", href: "/bible" },
  { label: "Prayers", href: "/prayers" },
  { label: "Saints", href: "/saints" },
  { label: "Calendar", href: "/calendar" },
  { label: "Marketplace", href: "/marketplace" },
];

const SECONDARY = [
  { label: "Support", href: "/support" },
  { label: "Account", href: "/account" },
];

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Always show the bg when the mobile menu is open, even at the very top.
  const showBg = scrolled || open;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-[72px] transition-[background-color,border-color,backdrop-filter] duration-200",
        showBg
          ? "bg-night/85 backdrop-blur border-b border-white/8"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto max-w-[1240px] h-full flex items-center justify-between gap-6 px-5 md:px-8">
        <Link
          href="/"
          className="font-sans text-[22px] font-bold tracking-[-0.01em] text-paper hover:text-paper/80 transition-colors duration-150"
        >
          Purify
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "font-sans text-[15px] font-medium transition-colors duration-150",
                isActive(it.href)
                  ? "text-paper"
                  : "text-paper/65 hover:text-paper",
              )}
            >
              {it.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-5">
          {SECONDARY.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "font-sans text-[14px] font-medium transition-colors duration-150",
                isActive(it.href)
                  ? "text-paper"
                  : "text-paper/65 hover:text-paper",
              )}
            >
              {it.label}
            </Link>
          ))}
          <ComingSoonCTA variant="inverse" className="!py-2.5 !px-5 text-[14px]">
            Try Free
          </ComingSoonCTA>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-pill border border-paper/20 text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-[18px]">{open ? "✕" : "≡"}</span>
        </button>
      </div>

      {open && (
        <div className="md:hidden absolute left-0 right-0 top-[72px] bg-night border-b border-white/8">
          <nav className="flex flex-col px-5 py-4 gap-1">
            {[...NAV, ...SECONDARY].map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="font-sans text-[16px] font-medium text-paper/85 hover:text-paper py-3 border-b border-white/5 last:border-0"
              >
                {it.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
