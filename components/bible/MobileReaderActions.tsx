"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { Settings } from "@/components/ui/icons/Settings";
import {
  ReaderFontFamilyButton,
  ReaderFontSizeButton,
} from "@/components/reader/ReaderPrefs";

/**
 * Mobile-only trailing-slot action cluster for the Bible reader top
 * bar. Two stub-or-live affordances modeled on the YouVersion top
 * right cluster:
 *
 *  - Bookmark: stub icon. Real persistence lands in a follow-up.
 *    Tapping briefly flashes a "saved" hint but doesn't yet write
 *    anywhere — the prompt explicitly says to stub.
 *  - Settings: opens the existing `ReaderFontFamilyButton` +
 *    `ReaderFontSizeButton` controls inside a bottom Sheet. These
 *    are the same controls the saints reader uses, so a reader's
 *    pick carries across.
 *
 * Hidden on `md+` — desktop has the inline control row.
 */
export function MobileReaderActions() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarkFlash, setBookmarkFlash] = useState(false);

  function flashBookmark() {
    setBookmarkFlash(true);
    setTimeout(() => setBookmarkFlash(false), 900);
  }

  return (
    <>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="Bookmark this chapter"
          onClick={flashBookmark}
          className={
            "h-10 w-10 inline-flex items-center justify-center rounded-pill transition-colors " +
            (bookmarkFlash
              ? "text-gold"
              : "text-paper/70 hover:text-paper")
          }
        >
          <Bookmark size={18} />
        </button>
        <button
          type="button"
          aria-label="Reader settings"
          onClick={() => setSettingsOpen(true)}
          className="h-10 w-10 inline-flex items-center justify-center rounded-pill text-paper/70 hover:text-paper"
        >
          <Settings size={18} />
        </button>
      </div>

      <Sheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Reader settings"
      >
        <div className="space-y-4 py-2">
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
              Typeface
            </p>
            <ReaderFontFamilyButton />
          </div>
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
              Size
            </p>
            <ReaderFontSizeButton />
          </div>
          <p className="font-sans text-[12px] text-paper/45 leading-[1.55] pt-2">
            Your choices are saved on this device and apply to the
            saint-works reader as well.
          </p>
        </div>
      </Sheet>
    </>
  );
}
