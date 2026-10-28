"use client";

import { useState } from "react";
import { ReaderSettingsSheet } from "@/components/bible/ReaderSettingsMenu";
import { ReaderMoreSheet } from "@/components/bible/ReaderMoreSheet";
import { More } from "@/components/ui/icons/More";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * The Bible reader's round buttons over the page, beside the way back (1.8,
 * the owner's pick B of round 2, "The page": "No bar at all, only two round
 * buttons over the page"; Homebase/boards/purify-master/variants/02-bible).
 * They are the page's top bar's `trailing` (MobileTopBar `plates`), which
 * draws them on its round plates.
 *
 *  - Aa: every reader preference (ReaderSettingsSheet): text size, font,
 *    spacing, the reading mode, ambience, focus, paragraphs, keep scrolling
 *    and the Greek. It was the top bar's settings icon in 1.7.
 *  - •••: the search, the book's chapters, the translation, the book, the
 *    Greek, the bookmark and the app's search (ReaderMoreSheet), which stood
 *    above the chapter's title and in the top bar until 1.7.
 *
 * "Aa" is the mark readers know for text settings in any language, drawn as
 * the settings sheet draws its sizes, with the letter A; the button's name
 * is the catalog's. Hidden on `md+` on the website, which has the toolbar's
 * pills; a tablet in the apps keeps the phone's buttons.
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t("bible.readerSettings")}
          aria-haspopup="dialog"
          onClick={() => setOpen("settings")}
          className="tap-press hit-44 inline-flex h-10 w-10 items-center justify-center"
        >
          {/* The letter twice, as the settings' own "Aa" previews draw it
              (ReaderPrefs), so the mark is a drawing and not a word. */}
          <span aria-hidden className="inline-flex items-baseline font-serif text-[16px] font-semibold leading-none">
            <span>A</span>
            <span>a</span>
          </span>
        </button>
        <button
          type="button"
          aria-label={t("bible.moreActions")}
          aria-haspopup="dialog"
          onClick={() => setOpen("more")}
          className="tap-press hit-44 inline-flex h-10 w-10 items-center justify-center"
        >
          <More size={20} />
        </button>
      </div>

      <ReaderSettingsSheet open={open === "settings"} onClose={close} showInterlinear={showInterlinear} />
      <ReaderMoreSheet
        open={open === "more"}
        onClose={close}
        book={book}
        bookName={bookName}
        chapter={chapter}
        showInterlinear={showInterlinear}
        configuredLicensed={configuredLicensed}
      />
    </>
  );
}
