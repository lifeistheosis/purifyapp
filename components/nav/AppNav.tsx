"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

const items = [
  { label: "Bible", href: "/bible" },
  { label: "Prayers", href: "/prayers" },
  { label: "Saints", href: "/saints" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "Calendar", href: "/calendar" },
  { label: "Marketplace", href: "/marketplace" },
];

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-night/85 backdrop-blur border-b border-white/8 h-[72px]">
      <div className="mx-auto max-w-[1240px] h-full flex items-center justify-between px-5 md:px-8">
        <Link
          href="/"
          className="font-sans text-[22px] font-bold tracking-[-0.01em] text-paper hover:text-paper/80 transition-colors duration-150"
        >
          Purify
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          {items.map((it) => {
            const active = pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "font-sans text-[15px] font-medium transition-colors duration-150",
                  active ? "text-paper" : "text-paper/65 hover:text-paper",
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/pricing"
            className="font-sans text-[14px] font-medium text-paper/85 hover:text-paper"
          >
            Pricing
          </Link>
          <Link
            href="/account"
            className="font-sans text-[14px] font-medium text-paper/85 hover:text-paper"
          >
            Account
          </Link>
        </div>
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-pill border border-paper/20 text-paper"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-[18px]">{open ? "✕" : "≡"}</span>
        </button>
      </div>
      {open && (
        <div className="md:hidden absolute left-0 right-0 top-[72px] bg-night border-b border-white/8">
          <nav className="flex flex-col px-5 py-4 gap-1">
            {[...items, { label: "Pricing", href: "/pricing" }, { label: "Account", href: "/account" }].map(
              (it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="font-sans text-[16px] font-medium text-paper/85 hover:text-paper py-3 border-b border-white/5 last:border-0"
                >
                  {it.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
