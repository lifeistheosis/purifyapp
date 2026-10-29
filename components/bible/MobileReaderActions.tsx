"use client";

import { useState } from "react";
import { ReaderSettingsSheet } from "@/components/bible/ReaderSettingsMenu";
import { ReaderMoreSheet } from "@/components/bible/ReaderMoreSheet";
import { More } from "@/components/ui/icons/More";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { BIBLE_START_SIZE } from "@/components/reader/ReaderPrefs";

/**
 * The Bible reader's round button over the page, opposite the way back (1.8,
 * the owner's pick B of round 2, "The page": "No bar at all, only two round
 * buttons over the page"; Homebase/boards/purify-master/variants/02-bible).
 * It is the page's top bar's `trailing` (MobileTopBar `plates`), which draws
 * it on its round plate.
 *
 * Two round buttons, not three (the owner's pick B of 2026-10-28,
 * r18/choose/4-bible-buttons: "Two (Aa inside •••)"): the way back, and •••.
 * The reader's settings had a round Aa button of their own beside •••; they
 * are the first row of the ••• sheet now, and open the same sheet
 * (ReaderSettingsSheet: text size, font, spacing, the reading mode,
 * ambience, focus, paragraphs, keep scrolling and the Greek). After them the
 * sheet holds the search, the book's chapters, the translation, the book,
 * the Greek, the bookmark and the app's search (ReaderMoreSheet), which
 * stood above the chapter's title and in the top bar until 1.7.
 *
 * The settings open on the size this page reads at: Large for a reader who
 * has never chosen one (BIBLE_START_SIZE). Hidden on `md+` on the website,
 * which has the toolbar's pills; a tablet in the apps keeps the phone's
 * button.
 */
export function MobileReaderActions({
  book,
  bookName,
  chapter,
  showInterlinear = false,
  configuredLicensed = [],
}: {
  book: string;
  bookName: string;
  chapter: number;
  /** Whether this chapter offers the Interlinear Greek toggle (NT, public-domain text). */
  showInterlinear?: boolean;
  /** Licensed translation ids whose API access is configured. */
  configuredLicensed?: string[];
}) {
  const { t } = useTranslate();
  const [open, setOpen] = useState<"settings" | "more" | null>(null);
  const close = () => setOpen(null);

  return (
    <>
      <button
        type="button"
        aria-label={t("bible.moreActions")}
        aria-haspopup="dialog"
        onClick={() => setOpen("more")}
        className="tap-press hit-44 inline-flex h-10 w-10 items-center justify-center"
      >
        <More size={20} />
      </button>

      <ReaderMoreSheet
        open={open === "more"}
        onClose={close}
        onSettings={() => setOpen("settings")}
        book={book}
        bookName={bookName}
        chapter={chapter}
        showInterlinear={showInterlinear}
        configuredLicensed={configuredLicensed}
      />
      <ReaderSettingsSheet open={open === "settings"} onClose={close} showInterlinear={showInterlinear} startSize={BIBLE_START_SIZE} />
    </>
  );
}
