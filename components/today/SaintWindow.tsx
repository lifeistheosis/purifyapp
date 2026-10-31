"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Close } from "@/components/ui/icons/Close";
import { Sheet } from "@/components/ui/Sheet";
import { isNativeClient } from "@/lib/platform/native";
import type { SaintBrief } from "@/lib/saints/brief";
import { feastDaysIn } from "@/lib/saints/feastDay";
import { quoteFace, type SaintPicture } from "@/lib/today/saintFaces";
import { quoted, readWhereFrom, saintByline, saintPictureInput, saintQuote, type SaintWords } from "@/lib/today/saintWords";

import { SaintFace } from "./SaintFace";

type WindowSaint = Pick<SaintBrief, "slug" | "name" | "epithet"> & Partial<Pick<SaintBrief, "feastDays" | "iconUrl">>;

// Loaded on the tap, as the verse card loads it: Today carries no canvas for
// a reader who never shares.
const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

/**
 * The saint's window (1.8, the owner's round 12: "a tap on him opens a window
 * to share an image or read where the quote is from";
 * Homebase/boards/purify-master/r18/choose/12b-church-saint.png, "2. Tap him:
 * share or read"). Opened from his band in The Church today, on a day whose
 * saint has words of his own the app can show where they stand.
 *
 * His face, his name and years (the first of his titles and the year he
 * reposed), and they open his page, which the band opened before it had a
 * window; his words large; where they come from, in the source line every
 * quotation wears (components/citations/SourceLine.tsx); then the two
 * actions:
 *
 *   Share as a picture    the picture sheet the verse uses
 *                         (components/share/PictureSheet.tsx), with his own
 *                         looks since round 3 (r3-11, the owner's pick of all
 *                         three): the Portrait, his cover portrait beside his
 *                         words; the Page, the picture as a plate over a page;
 *                         the Seal, his words alone with his face as a seal;
 *                         each in nine looks (r3-11b). His face is his cover
 *                         portrait (lib/today/saintFaces.ts, quoteFace).
 *   Read where it's from  the work's page at that place (the source line's
 *                         own link). A text the library does not carry has no
 *                         page to open, so there it is not offered.
 *
 * The shared movable sheet (components/ui/Sheet.tsx), open at its full height
 * because it ends in its actions.
 */
export function SaintWindow({
  open,
  onClose,
  saint,
  words,
  picture,
}: {
  open: boolean;
  onClose: () => void;
  saint: WindowSaint;
  words: SaintWords;
  picture: SaintPicture | null;
}) {
  const { t, locale } = useTranslate();
  const [making, setMaking] = useState(false);
  const work = words.shown.kind === "father" || words.shown.kind === "text" ? words.shown.work : null;
  // The same object while the words are the same: the sheet draws its
  // preview again when they change.
  const pictureWords = useMemo(() => ({ ...saintPictureInput(words, saint.name), ...(work ? { note: work } : {}) }), [words, saint.name, work]);
  // Whose words they are, for his own looks in the sheet: made when the sheet opens.
  const quote = useMemo(
    () =>
      making
        ? saintQuote({
            saint,
            words,
            face: quoteFace(saint, isNativeClient()),
            pageHead: t("saints.inHisOwnWords"),
            feast: saint.feastDays?.[0] ? feastDaysIn([saint.feastDays[0]], locale, "long", t) : undefined,
            lang: locale,
          })
        : undefined,
    [making, saint, words, t, locale],
  );

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={saint.name}
        desktop
        openFull
        header={<SaintWindowHead saint={saint} words={words} picture={picture} onClose={onClose} />}
      >
        <SaintWindowBody
          words={words}
          onShare={() => {
            // One sheet at a time: the window steps aside for the picture's.
            setMaking(true);
            onClose();
          }}
          onLeave={onClose}
          said={null}
        />
      </Sheet>
      {making ? (
        <PictureSheet
          open={making}
          onClose={() => setMaking(false)}
          words={pictureWords}
          title={saint.name}
          name={saint.name}
          caption={work ? `${saint.name}\n${work}` : saint.name}
          referenceLabel={saint.name}
          quote={quote}
        />
      ) : null}
    </>
  );
}

/** The window's head: his face, name and years, opening his page; and the close button. */
export function SaintWindowHead({
  saint,
  words,
  picture,
  onClose,
}: {
  saint: WindowSaint;
  words: SaintWords;
  picture: SaintPicture | null;
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const byline = saintByline(saint.epithet, words.reposed);
  return (
    <div className="flex items-center gap-2 px-4 pb-1 pt-1.5">
      <Link href={`/saints/${saint.slug}`} onClick={onClose} className="tap-press flex min-w-0 flex-1 items-center gap-3 ps-1.5">
        <span className="relative size-[52px] shrink-0 overflow-hidden rounded-full border border-paper/20 bg-night-soft">
          {picture ? <SaintFace key={picture.src} picture={picture} zoom={1.4} /> : null}
        </span>
        <span className="min-w-0">
          <span className="block font-heading text-lede font-bold leading-tight text-paper">{saint.name}</span>
          {byline ? <span className="mt-0.5 block font-sans text-caption text-paper/55">{byline}</span> : null}
        </span>
        <ChevronRight size={14} className="shrink-0 text-paper/35 rtl:-scale-x-100" />
      </Link>
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="tap-press -me-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-paper/65 hover:text-paper"
      >
        <Close size={16} />
      </button>
    </div>
  );
}

/** His words large, where they come from, and the two actions. */
export function SaintWindowBody({
  words,
  onShare,
  onLeave,
  said,
}: {
  words: SaintWords;
  onShare: () => void;
  /** Followed as the reader leaves for the place the words are from. */
  onLeave: () => void;
  /** What the last action came to, said for a moment. */
  said: string | null;
}) {
  const { t } = useTranslate();
  const where = readWhereFrom(words.shown);
  // Long words are set a step smaller, so the actions stay in reach.
  const long = words.text.length > 180;
  return (
    <div className="px-1.5 pb-3">
      <blockquote
        lang="en"
        data-saint-words=""
        className={`mt-4 font-heading italic leading-[1.42] text-paper ${long ? "text-lede" : "text-title-sm"}`}
      >
        {quoted(words.text)}
      </blockquote>
      <SourceLine cite={words.shown} className="mt-2.5" />

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onShare}
          data-saint-share=""
          className="tap-press flex min-h-13 items-center justify-center gap-2.5 rounded-pill bg-paper px-5 font-sans text-[15px] font-semibold text-night"
        >
          <ShareMark size={18} />
          {t("today.verse.shareAsPicture")}
        </button>
        {where ? (
          <Link
            href={where}
            onClick={onLeave}
            data-saint-source=""
            className="tap-press flex min-h-13 items-center justify-center gap-2.5 rounded-pill border border-paper/22 px-5 font-sans text-[15px] font-semibold text-paper"
          >
            <Book size={18} />
            {t("today.saintWords.readSource")}
          </Link>
        ) : null}
      </div>
      {said ? (
        <p role="status" className="mt-3 text-center font-sans text-caption text-paper/70">
          {said}
        </p>
      ) : null}
    </div>
  );
}

/** The share mark: a box with an arrow rising out of it. */
export function ShareMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 15V3.5" />
      <path d="M7.5 8 12 3.5 16.5 8" />
      <path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5" />
    </svg>
  );
}
