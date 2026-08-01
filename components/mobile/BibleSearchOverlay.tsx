"use client";

// Header trigger + full-screen overlay for Bible search.
//
// The icon sits in the MobileHeader trailing slot; tapping opens a
// full-width sheet with the existing <BibleSearch /> component inside
// so the search behaviour is identical to the desktop hero, but the
// Bible mobile body keeps the shelves uncluttered.

import { useEffect, useState } from "react";
import { BibleSearch } from "@/components/bible/BibleSearch";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function BibleSearchTrigger() {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [open]);

  // Android hardware back closes the sheet instead of leaving the page —
  // the sheet is a full-screen overlay with no browser history of its own,
  // so without this the back button feels like the screen is stuck.
  useAndroidBack(open, () => setOpen(false));

  return (
    <>
      <button
        type="button"
        aria-label={t("bible.searchAria")}
        onClick={() => setOpen(true)}
        className="tap-press inline-flex items-center justify-center h-9 w-9 rounded-full border border-paper/15 bg-paper/[0.04] text-paper/75 hover:text-paper"
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
          aria-label={t("bible.searchAria")}
          className="fixed inset-0 z-50 bg-night/95 backdrop-blur-sm flex flex-col"
        >
          <header
            className="flex items-center justify-between px-5 pb-3 border-b border-paper/10"
            // Clear the status bar: inset + the original 1rem of breathing
            // room. Belt-and-suspenders with StatusBar.setOverlaysWebView in
            // NativeBridge; on web the inset is 0 so this is just pt-4.
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
          >
            <p className="font-sans text-caption uppercase tracking-[1.5px] text-paper/55">
              {t("common.search")}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-sans text-detail text-paper/75 hover:text-paper"
            >
              {t("common.cancel")}
            </button>
          </header>
          <div className="px-5 pt-6 pb-10 flex-1 overflow-y-auto">
            <BibleSearch />
            <p className="mt-3 font-sans italic text-caption text-paper/45">
              {t("ui.tryJohn3161")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
