"use client";

import { useState } from "react";

import { ReaderSettingsSheet, ToggleRow } from "@/components/bible/ReaderSettingsMenu";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { More } from "@/components/ui/icons/More";
import { Search } from "@/components/ui/icons/Search";
import { Sheet } from "@/components/ui/Sheet";
import { useBookmarks } from "@/lib/bookmarks";
import { openWorkAbout, useWorkNow } from "@/lib/saints/workNow";
import { openSearch } from "@/lib/search/open";
import { softTick } from "@/lib/ui/softTick";
import { TOP_ICON, TOP_PLATE } from "@/components/nav/topPlate";

/**
 * The round ••• over a work's page, opposite the way back (1.8, the owner's
 * pick A of r3-29, the Bible's page; components/bible/MobileReaderActions.
 * tsx). It is the page's top bar's `trailing` (MobileTopBar `plates`), which
 * draws it on its round plate. Its sheet holds what the Bible's holds for a
 * chapter: the reader's settings (the same sheet, the same preferences),
 * Bookmark this chapter, by the work's own name for it ("Bookmark Conference
 * 10 · 10"), About this book, and the search of the whole app. The chapter
 * being read is the reader's (lib/saints/workNow.ts).
 *
 * Until 1.8 this slot held one gear for the settings, in a bar of its own.
 */
export function MobileWorkActions() {
  const { t } = useTranslate();
  const [open, setOpen] = useState<"settings" | "more" | null>(null);
  const close = () => setOpen(null);
  const now = useWorkNow();
  const bookmarks = useBookmarks();
  const locator = now && now.saintSlug ? { kind: "writing-section" as const, saintSlug: now.saintSlug, workSlug: now.workSlug, sectionN: now.sectionN } : null;
  const saved = locator ? bookmarks.isBookmarked(locator) : false;

  function toggleSaved() {
    if (!now || !locator) return;
    bookmarks.toggle({
      kind: "writing-section",
      saintSlug: now.saintSlug,
      saintName: now.saintName,
      workSlug: now.workSlug,
      workTitle: now.workTitle,
      sectionN: now.sectionN,
      sectionTitle: now.sectionTitle,
      label: `${now.saintName}, ${now.workTitle}, ${now.sectionTitle}`,
    });
    if (!saved) softTick();
  }

  const row =
    "inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-pill border border-paper/15 bg-paper/[0.04] px-3.5 font-sans text-detail font-medium text-paper/85 hover:border-paper/30 hover:bg-paper/10";
  return (
    <>
      <button
        type="button"
        aria-label={t("bible.moreActions")}
        aria-haspopup="dialog"
        onClick={() => setOpen("more")}
        className={`tap-press ${TOP_PLATE}`}
      >
        <More size={TOP_ICON.size} />
      </button>

      <Sheet open={open === "more"} onClose={close} title={now?.label ?? now?.workTitle ?? t("bible.moreActions")}>
        <div className="space-y-2.5 pt-1">
          <button type="button" aria-haspopup="dialog" onClick={() => setOpen("settings")} className={row}>
            <span className="inline-flex min-w-0 items-center gap-2">
              <span aria-hidden className="inline-flex shrink-0 items-baseline font-serif text-[14px] font-semibold leading-none">
                <span>A</span>
                <span>a</span>
              </span>
              <span className="truncate">{t("bible.readerSettings")}</span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-paper/55 rtl:-scale-x-100" />
          </button>
          {/* The sheet's title names the section, so the row says what it does in the words the
              paragraph's menu uses for the same bookmark (a writing-section); with the section's name
              in it, a long title was cut short (the gate's third run, 2026-11-11). */}
          {locator && now ? <ToggleRow on={saved} touch label={t("saints.bookmarkThisSection")} onClick={toggleSaved} /> : null}
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              close();
              openWorkAbout();
            }}
            className={row}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Book size={16} className="shrink-0" />
              <span className="truncate">{t("bible.aboutThisBook")}</span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-paper/55 rtl:-scale-x-100" />
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              openSearch("all");
            }}
            className={row}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Search size={16} className="shrink-0" />
              <span className="truncate">{t("search.ariaLabel")}</span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-paper/55 rtl:-scale-x-100" />
          </button>
        </div>
      </Sheet>
      {/* No Interlinear here: that is the New Testament's Greek. */}
      <ReaderSettingsSheet open={open === "settings"} onClose={close} showInterlinear={false} />
    </>
  );
}
