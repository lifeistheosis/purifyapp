"use client";

import { useState } from "react";
import Link from "next/link";
import { ComingSoonCTA } from "@/components/marketing/ComingSoonCTA";
import { useScrolled } from "@/lib/useScrolled";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "Today", href: "/prayers/today" },
  { label: "Bible", href: "/bible" },
  { label: "Prayers", href: "/prayers" },
  { label: "Saints", href: "/saints" },
  { label: "Calendar", href: "/calendar" },
];

const secondary = [
  { label: "Support", href: "/support" },
  { label: "Account", href: "/account" },
];

export function Navbar() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);

  // Force the dark bg on while the mobile menu is open so the panel reads cleanly.
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
      <div className="mx-auto max-w-[1240px] h-full flex items-center justify-between gap-4 px-5 md:px-8">
        <Link
          href="/"
          className="font-sans text-[22px] font-bold tracking-[-0.01em] text-paper hover:text-paper/80 transition-colors duration-150"
        >
          Purify
        </Link>

        <nav className="hidden md:flex items-center gap-9">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="font-sans text-[15px] font-medium text-paper/85 hover:text-paper transition-colors duration-150"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-5">
          {secondary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-sans text-[14px] font-medium text-paper/85 hover:text-paper transition-colors duration-150"
            >
              {item.label}
            </Link>
          ))}
          <ComingSoonCTA variant="inverse" className="!py-2.5 !px-5 text-[14px]">
            Try Free
          </ComingSoonCTA>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          className="sm:hidden inline-flex items-center justify-center h-11 w-11 rounded-pill border border-paper/20 text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-[20px]">{open ? "✕" : "≡"}</span>
        </button>
      </div>

      {open && (
        <div className="sm:hidden absolute left-0 right-0 top-[72px] bg-night border-b border-white/8 shadow-lg">
          <nav className="flex flex-col px-5 py-3">
            {[...navItems, ...secondary].map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="font-sans text-[16px] font-medium text-paper/85 hover:text-paper py-3.5 border-b border-white/5 last:border-0"
              >
                {it.label}
              </Link>
            ))}
            <div className="mt-4 mb-2">
              <ComingSoonCTA variant="inverse" className="w-full !py-3 text-[15px]">
                Try Free
              </ComingSoonCTA>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
