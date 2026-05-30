"use client";

// Header trigger + full-screen overlay for Bible search.
//
// The icon sits in the MobileHeader trailing slot; tapping opens a
// full-width sheet with the existing <BibleSearch /> component inside
// so the search behaviour is identical to the desktop hero, but the
// Bible mobile body keeps the shelves uncluttered.

import { useEffect, useState } from "react";
import { BibleSearch } from "@/components/bible/BibleSearch";

export function BibleSearchTrigger() {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Search the Bible"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-paper/15 bg-paper/[0.04] text-paper/75 hover:text-paper active:scale-95 transition-transform"
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx={11} cy={11} r={7} />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search the Bible"
          className="fixed inset-0 z-50 bg-night/95 backdrop-blur-sm flex flex-col"
        >
          <header className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-paper/10">
            <p className="font-sans text-[12px] uppercase tracking-[1.5px] text-paper/55">
              Search
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-sans text-[13px] text-paper/75 hover:text-paper"
            >
              Cancel
            </button>
          </header>
          <div className="px-5 pt-6 pb-10 flex-1 overflow-y-auto">
            <BibleSearch />
            <p className="mt-3 font-sans italic text-[12px] text-paper/45">
              Try: &lsquo;John 3:16&rsquo; · &lsquo;1 Cor 13&rsquo; · &lsquo;Psalm 23&rsquo;
            </p>
          </div>
        </div>
      )}
    </>
  );
}
