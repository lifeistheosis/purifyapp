"use client";

import Link from "next/link";
import { ComingSoonCTA } from "@/components/marketing/ComingSoonCTA";
import { useScrolled } from "@/lib/useScrolled";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "Bible", href: "/bible" },
  { label: "Prayers", href: "/prayers" },
  { label: "Saints", href: "/saints" },
  { label: "Calendar", href: "/calendar" },
  { label: "Marketplace", href: "/marketplace" },
];

const secondary = [
  { label: "Pricing", href: "/pricing" },
  { label: "Account", href: "/account" },
];

export function Navbar() {
  const scrolled = useScrolled();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-[72px] transition-[background-color,border-color,backdrop-filter] duration-200",
        scrolled
          ? "bg-night/85 backdrop-blur border-b border-white/8"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto max-w-[1240px] h-full flex items-center justify-between px-5 md:px-8">
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
      </div>
    </header>
  );
}
