"use client";

// Each part of Plus, shown as it looks (1.9, the fifteen screens' round 3).
// The fresh eyes' finding on the Plus page: "A good opening picture, then
// eight identical boxed cards, each an icon tile, a paragraph and 'Try it'."
// The direction: "show each part of Plus as it looks: a reading mode worn, a
// journal cover, the Greek beside a verse".
//
// So under the scribe each part stands as a specimen of itself, made from the
// app's own component or picture for it, with its name and its one line under
// it in the rows' own keys (lib/premium/plusRows.ts), one under another with
// a hairline between and no box around any:
//
//   Word study          John 1:1 in the Greek beside the English, from the
//                       chapter's own file, the studied word marked
//   the reading modes   Settings' small page (ModePage) worn in three of the
//                       palettes Plus adds, side by side
//   Cross-references    a verse of John 1 and the places it echoes, from the
//                       chapter's own file
//   the journal         three of the covers its picker offers, as it draws them
//   Listen offline      a saved recording's row: its cover, the player's own
//                       line and the check
//   Ambience            the sounds' photographs, as the sheet's tiles wear them
//   Compare             Psalm 50:1 in the app's English and the Greek
//                       Church's text, each at its own place
//   the profile         the avatar in three of its frames
//   the mark            the mark by a name, as Community shows it
//
// A part with no honest specimen (the plans, Remember the verse, the
// Florilegium, every device, history) stands plainly: its name and its line,
// with no icon tile. The specimens differ in shape because the things differ.
//
// The whole piece is the way to try it, where the row ended in "Try it"
// before: one button, named by the part, as tall as the piece. A specimen is
// a picture of the part and is hidden from a screen reader; the name and the
// line are what it reads. What each specimen shows is said, and held to the
// app's data, in lib/premium/plusParts.ts.
//
// The upgrade sheet (components/billing/UpgradeModal.tsx) shows these parts
// too when no lock leads it, as from the header's Plus button, so both doors
// to Plus show the same. Opened by a lock, it keeps its rows
// (PlusFeatureRows): there the lock's own feature leads, lit, in the lock's
// words.

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { ChantCover } from "@/components/chants/ChantCover";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { SupporterMark } from "@/components/community/SupporterMark";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { AmbiencePhoto } from "@/components/player/AmbiencePhoto";
import { BIBLE_START_SIZE, FONT_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { ModePage } from "@/components/settings/ReadingModePages";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { AMBIENCE_TRACKS } from "@/lib/ambience/ambience";
import { loadInterlinear } from "@/lib/bible/chapterData";
import { unpackCrossRefs, type StoredCrossRefs } from "@/lib/bible/crossRefPack";
import { crossRefNumbers, type CrossRefItem } from "@/lib/bible/crossRefShape";
import { DOWNLOADABLE_BIBLES } from "@/lib/bible/downloads/catalog";
import { chantTitleKey } from "@/lib/chants/names";
import { cn } from "@/lib/cn";
import { useDesktopApp } from "@/lib/desktop/useDesktopApp";
import { textDir } from "@/lib/i18n/textDir";
import {
  PART_COMPARE,
  PART_COVERS,
  PART_FRAMES,
  PART_MODES,
  PART_OFFLINE,
  PART_REFS,
  PART_SOUNDS,
  PART_WORD,
  isPartSpecimen,
  type PartSpecimen,
} from "@/lib/premium/plusParts";
import { PLUS_ROWS, rowsHere, type PlusRow } from "@/lib/premium/plusRows";
import { TRY_COMPARE, TRY_COMPARE_BIBLES, TRY_COMPARE_ENGLISH } from "@/lib/premium/tryCompare";
import { DECORATIONS } from "@/lib/profile/cosmetics";
import { useMyPicture } from "@/lib/profile/myPicture";
import { READING_THEMES } from "@/lib/reader/readingModes";
import { JOHN_1_OPENING, PREVIEW_CHAPTER } from "@/lib/settings/preview";

/** The Greek in the Bible's Greek face, as the reader sets it. */
const GREEK = { fontFamily: "var(--font-greek), serif" } as const;

/** A specimen's small line: the house's (round 1). */
const SMALL = "font-sans text-caption font-semibold text-paper/55";

/** Where the journal's covers are kept (public/saints/icons, carried in the apps). */
const COVERS_AT = "/saints/icons/";

/**
 * Every part of Plus, one under another. `onTry` is Try it: the feature's own
 * screen for a moment (components/billing/PlusTry.tsx), called from the tap.
 * The list rises in as one block, as the rows it replaces did.
 */
export function PlusParts({ onTry, className }: { onTry?: (id: string) => void; className?: string }) {
  const { t } = useTranslate();
  const desktopApp = useDesktopApp();
  const rows = rowsHere(PLUS_ROWS, { desktopApp });
  return (
    <div className={className}>
      <ul className="paywall-in divide-y divide-paper/10" style={{ animationDelay: "280ms" }} aria-label={t("plus.sheet.title")} data-plus-parts="">
        {rows.map((row) => (
          <PlusPart key={row.id} row={row} onTry={onTry ? () => onTry(row.id) : undefined} />
        ))}
      </ul>
      <p className="mt-1 border-t border-paper/10 pt-4 font-sans text-caption leading-[1.5] text-paper/45">{t("plus.general.keep")}</p>
    </div>
  );
}

/** One part: its specimen where it has one, its name, its line, and the chevron of a piece that opens. */
function PlusPart({ row, onTry }: { row: PlusRow; onTry?: () => void }) {
  const { t } = useTranslate();
  const piece = (
    <>
      {isPartSpecimen(row.id) ? <Specimen id={row.id} /> : null}
      <span className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-title-sm font-semibold leading-[1.2] text-paper">{t(row.name)}</span>
          <span className="mt-1.5 block font-sans text-detail leading-[1.5] text-paper/65">{t(row.body)}</span>
        </span>
        {onTry ? <ChevronRight size={18} className="shrink-0 text-paper/45 rtl:-scale-x-100" /> : null}
      </span>
    </>
  );
  return (
    <li data-plus-feature={row.id} data-plus-part={isPartSpecimen(row.id) ? "specimen" : "plain"}>
      {onTry ? (
        <button
          type="button"
          onClick={onTry}
          data-plus-try-open={row.id}
          className="press-card block w-full py-7 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          {piece}
        </button>
      ) : (
        <div className="py-7">{piece}</div>
      )}
    </li>
  );
}

const SPECIMENS: Readonly<Record<PartSpecimen, () => ReactNode>> = {
  "word-study": WordSpecimen,
  "reading-modes": ModesSpecimen,
  "cross-refs": RefsSpecimen,
  journal: CoversSpecimen,
  offline: SavedSpecimen,
  ambience: SoundsSpecimen,
  compare: CompareSpecimen,
  profile: FramesSpecimen,
  "supporter-mark": MarkSpecimen,
};

/** A part's specimen: a picture of it, over its name. Hidden from a screen reader, and never in the way of the tap. */
function Specimen({ id }: { id: PartSpecimen }) {
  const Drawn = SPECIMENS[id];
  return (
    <span aria-hidden data-plus-specimen={id} className="pointer-events-none mb-5 block empty:hidden">
      <Drawn />
    </span>
  );
}

/** A verse of John 1, in the app's own words (lib/settings/preview.ts, the Bible's own file). */
function johnVerse(n: number): string {
  return JOHN_1_OPENING.find((v) => v.n === n)?.text ?? "";
}

/**
 * A chapter's file, asked for once the page is up (app/bible-data, carried in
 * the apps and read from the page's own origin): undefined while it comes,
 * null if it could not be read.
 */
function useChapterFile<T>(load: () => Promise<T | null>): T | null | undefined {
  const [file, setFile] = useState<T | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void load()
      .catch(() => null)
      .then((read) => {
        if (live) setFile(read);
      });
    return () => {
      live = false;
    };
    // The loaders below are fixed: one chapter, asked for once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return file;
}

const loadGreek = () => loadInterlinear(PART_WORD.book, PART_WORD.chapter);

/** Word study: the verse in the Greek, the studied word marked, and the app's English under it. */
function WordSpecimen() {
  const { font } = useReaderPrefs(BIBLE_START_SIZE);
  const greek = useChapterFile(loadGreek);
  // With no Greek to show there is no specimen: the part stands plainly.
  if (greek === null) return null;
  const line = greek?.text[PART_WORD.verse] ?? "";
  const word = greek?.tokens[PART_WORD.verse]?.find((token) => token.s === PART_WORD.strongs)?.w ?? null;
  const pieces = word ? line.split(word) : [line];
  return (
    <>
      {/* Two lines' room on a phone while the file comes, so nothing under it moves. */}
      <span lang="grc" dir="ltr" style={GREEK} className="block min-h-[3.1em] text-[21px] leading-[1.55] text-paper sm:min-h-[1.55em]">
        {pieces.map((piece, i) => (
          <span key={i}>
            {i > 0 ? <span className="underline decoration-paper/45 decoration-1 underline-offset-[6px]">{word}</span> : null}
            {piece}
          </span>
        ))}
      </span>
      <span lang="en" dir="ltr" className={cn("mt-2.5 block text-ui leading-[1.6] text-paper/65", FONT_CLASSES[font])}>
        {johnVerse(PART_WORD.verse)}
      </span>
    </>
  );
}

/** The reading modes: Settings' own small page of John 1, worn in three palettes Plus adds, each with its name. */
function ModesSpecimen() {
  const { t } = useTranslate();
  const { font } = useReaderPrefs(BIBLE_START_SIZE);
  const book = t("bible.books.john");
  const chapter = t("bible.chapterN", { n: PREVIEW_CHAPTER });
  return (
    // The pages' scale (app/globals.css, .set-mode-page): three fit a 360px phone.
    <span className="flex gap-3" style={{ "--mp-k": 0.58 } as CSSProperties}>
      {PART_MODES.map((id) => {
        const mode = READING_THEMES.find((m) => m.id === id);
        return (
          <span key={id} className="flex flex-col items-start gap-2">
            <ModePage palette={id} font={font} book={book} chapter={chapter} />
            <span className="font-sans text-caption text-paper/65">{mode?.labelKey ? t(mode.labelKey) : mode?.label}</span>
          </span>
        );
      })}
    </span>
  );
}

/** The chapter's references alone: the places, without the words of each, which are a file a book. */
const loadRefs = (): Promise<Record<number, CrossRefItem[]> | null> =>
  fetch(`/bible-data/crossrefs/${PART_REFS.book}/${PART_REFS.chapter}.json`)
    .then((r) => (r.ok ? (r.json() as Promise<StoredCrossRefs>) : null))
    .then((packed) => (packed ? unpackCrossRefs(packed, () => null) : null));

/** Cross-references: a verse, and the places it echoes. */
function RefsSpecimen() {
  const { t } = useTranslate();
  const { font } = useReaderPrefs(BIBLE_START_SIZE);
  const refs = useChapterFile(loadRefs);
  const places = refs?.[PART_REFS.verse]?.slice(0, PART_REFS.most) ?? [];
  if (refs === null || (refs && places.length === 0)) return null;
  const reference = `${t(`bible.books.${PART_REFS.book}`)} ${PART_REFS.chapter}:${PART_REFS.verse}`;
  return (
    <>
      <span lang="en" dir="ltr" className={cn("block text-lede leading-[1.5] text-paper/90", FONT_CLASSES[font])}>
        {johnVerse(PART_REFS.verse)}
      </span>
      <span className={cn(SMALL, "mt-3 block")}>{t("bible.crossRefsFor", { reference })}</span>
      {/* A line's room while the file comes. */}
      <span className="mt-1 flex min-h-[21px] flex-wrap gap-x-4 gap-y-1 font-sans text-ui text-paper/85">
        {places.map((place, i) => (
          <span key={i} className="whitespace-nowrap">{`${t(`bible.books.${place.book}`)} ${crossRefNumbers(place)}`}</span>
        ))}
      </span>
    </>
  );
}

/** The journal: three of its covers, at the size and cut its cover picker draws them (components/journal/PageBlocks.tsx). */
function CoversSpecimen() {
  return (
    <span className="flex gap-2.5">
      {PART_COVERS.map((file) => (
        <span key={file} className="relative h-[112px] w-[88px] shrink-0 overflow-hidden rounded-[14px] bg-paper/[0.07]">
          <ArrivingImage src={`${COVERS_AT}${file}`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_22%]" />
        </span>
      ))}
    </span>
  );
}

/** Listen offline: a saved recording's row, its cover, the player's own line for it, and the check. */
function SavedSpecimen() {
  const { t } = useTranslate();
  if (!PART_OFFLINE) return null;
  return (
    <span className="flex items-center gap-3.5">
      <ChantCover cover={{ src: PART_OFFLINE.cover, alt: "" }} size="thumb" className="w-14 shrink-0 rounded-[10px]" />
      <span className="min-w-0 flex-1 font-sans text-ui font-semibold leading-[1.4] text-paper">
        {t("player.offline.saved", { book: t(chantTitleKey(PART_OFFLINE.key)) })}
      </span>
      <Check size={18} className="shrink-0 text-paper" />
    </span>
  );
}

/** Ambience: the first sounds, each in its photograph over its name, as the ambience sheet's tiles are. */
function SoundsSpecimen() {
  const { t } = useTranslate();
  return (
    <span className="flex gap-2">
      {AMBIENCE_TRACKS.slice(0, PART_SOUNDS).map((track) => (
        // Upright, as the sheet's tiles are: the picture over the name, which keeps two lines' room so a long one is whole.
        <span key={track.id} className="flex h-[112px] min-w-0 flex-1 flex-col overflow-hidden rounded-[12px] bg-paper/[0.05] ring-1 ring-inset ring-paper/10">
          <AmbiencePhoto track={track} className="" />
          <span className="block min-h-[2.3em] px-2.5 pb-2.5 pt-1 font-sans text-[12.5px] font-semibold leading-[1.15] text-paper [overflow-wrap:anywhere]">{t(track.labelKey)}</span>
        </span>
      ))}
    </span>
  );
}

/** Compare: one verse in the app's English and in the Greek Church's text, each at the place its own numbering puts it. */
function CompareSpecimen() {
  const { t } = useTranslate();
  const { font } = useReaderPrefs(BIBLE_START_SIZE);
  const bible = DOWNLOADABLE_BIBLES.find((b) => b.id === PART_COMPARE);
  const theirs = TRY_COMPARE_BIBLES.find((r) => r.bible === PART_COMPARE);
  if (!bible || !theirs) return null;
  const psalms = t(`bible.books.${TRY_COMPARE.book}`);
  return (
    <>
      <span className={cn(SMALL, "block")}>{`${psalms} ${TRY_COMPARE.chapter}:${TRY_COMPARE.verse}`}</span>
      <span lang="en" dir="ltr" className={cn("mt-1 block text-ui leading-[1.6] text-paper/90", FONT_CLASSES[font])}>
        {TRY_COMPARE_ENGLISH}
      </span>
      <span className={cn(SMALL, "mt-3.5 block")}>
        <span lang={bible.textLang} dir={textDir(bible.textLang)}>{bible.title}</span>
        {` · ${theirs.at}`}
      </span>
      <span lang={bible.textLang} dir={textDir(bible.textLang)} style={GREEK} className="mt-1 block text-[16px] leading-[1.6] text-paper/90">
        {theirs.words}
      </span>
    </>
  );
}

/** The reader as Community shows them: their own name and picture when signed in, "You" until then. */
function useMe(): { name: string; picture: string | null } {
  const { t } = useTranslate();
  const me = useMyPicture();
  return me.state === "in" ? { name: me.name, picture: me.picture } : { name: t("nav.you"), picture: null };
}

/** The profile: the avatar in the first of its frames, each with its name. */
function FramesSpecimen() {
  const { t } = useTranslate();
  const me = useMe();
  return (
    <span className="flex gap-6">
      {DECORATIONS.slice(0, PART_FRAMES).map((frame) => (
        <span key={frame} className="flex flex-col items-center gap-2.5">
          <CommunityAvatar name={me.name} url={me.picture} size={56} decoration={frame} ring={1} />
          <span className="font-sans text-caption text-paper/65">{t(`profile.frameName.${frame}`)}</span>
        </span>
      ))}
    </span>
  );
}

/** The mark: by a name, as a post in Community carries it. */
function MarkSpecimen() {
  const me = useMe();
  return (
    <span className="flex items-center gap-3">
      <CommunityAvatar name={me.name} url={me.picture} />
      <span className="flex min-w-0 items-center gap-1 font-sans text-ui font-semibold text-paper">
        <span className="truncate">{me.name}</span>
        <SupporterMark tier="plus" />
      </span>
    </span>
  );
}
