"use client";

import { useEffect, useMemo, useState } from "react";
import type { Verse, ChapterCommentary } from "@/lib/bible/load";
import type { ChapterInterlinear } from "@/lib/bible/chapterExtras";
import type { CrossRefItem } from "@/lib/bible/crossRefShape";
import {
  loadChapterCommentary,
  loadChapterCrossRefs,
  loadInterlinear,
  loadStrongs,
} from "@/lib/bible/chapterData";
import { useInterlinear } from "@/lib/bible/interlinear";
import { plusFeaturesNow } from "@/lib/entitlements/usePlusFeatures";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { CrossRefSheet } from "./CrossRefSheet";
import { WordStudySheet } from "./WordStudySheet";
import type { StrongsEntry } from "@/lib/bible/strongs";
import { VerseRow } from "./VerseRow";
import { MobileCommentarySheet } from "./MobileCommentarySheet";
import { HighlightLegend } from "./HighlightLegend";
import {
  FONT_CLASSES,
  SIZE_CLASSES,
  useReaderPrefs,
} from "@/components/reader/ReaderPrefs";
import { cn } from "@/lib/cn";
import { reportNowReading } from "@/lib/profile/client";

/** What was read for one chapter, tagged with the chapter it belongs to. */
type Read<T> = { key: string; data: T } | null;

const NO_NOTES: ChapterCommentary = {};

export function ChapterReader({
  book,
  bookName,
  chapter,
  verses,
  commentaryVerses,
  commentary,
  hasInterlinear = false,
  crossRefVerses,
  testament = "NT",
}: {
  book: string;
  /** Display name of the book (e.g. "Matthew"). Used by the verse
   *  right-click menu to build copy-as-quote and copy-reference strings. */
  bookName: string;
  chapter: number;
  verses: Verse[];
  /** The verses the Fathers comment on: where the mark is drawn. */
  commentaryVerses?: number[];
  /** The chapter's commentary, when the page carries it (the website does,
   *  so a search engine reads it). Absent in the apps, where it is a file
   *  fetched the first time a verse's commentary is opened. */
  commentary?: ChapterCommentary;
  /** Whether the Greek can stand beside this chapter. The Greek itself, the
   *  English tagged to pair with it and the lexicon are files, fetched when
   *  the reader switches the Greek on (lib/bible/chapterData.ts). */
  hasInterlinear?: boolean;
  /** The verses that have cross-references (New Testament only): where the
   *  mark is drawn. The references are a file, fetched when a Plus reader
   *  opens one. */
  crossRefVerses?: number[];
  /** "OT" or "NT": the testament the word study opens on. */
  testament?: string;
}) {
  const { size, font, leadingValue } = useReaderPrefs();
  const key = `${book}/${chapter}`;
  // "Now reading" on the reader's Community profile, if they turned it on
  // (lib/profile/client.ts checks the switch on this device; the server
  // checks the real one). Book and chapter only, once per chapter.
  useEffect(() => {
    reportNowReading(`${book}/${chapter}`);
  }, [book, chapter]);
  const has = useMemo(() => new Set(commentaryVerses ?? []), [commentaryVerses]);
  const hasRefs = useMemo(() => new Set(crossRefVerses ?? []), [crossRefVerses]);
  const [openVerse, setOpenVerse] = useState<number | null>(null);

  // The Greek, read when it is switched on and not before. Until 1.5.1 every
  // chapter page carried it, the English tagged to pair with it and a cut of
  // the lexicon, twice over, for a switch most readers leave off. A reader
  // who has it on sees the English first and the Greek a moment later, as
  // they already did: the switch lives on the device and the page is drawn
  // before it is read.
  const { on: interlinearOn } = useInterlinear();
  const [greek, setGreek] = useState<Read<{ lines: ChapterInterlinear; strongs: Record<string, StrongsEntry> }>>(null);
  useEffect(() => {
    if (!hasInterlinear || !interlinearOn) return;
    let live = true;
    void Promise.all([loadInterlinear(book, chapter), loadStrongs()]).then(([lines, strongs]) => {
      if (live && lines) setGreek({ key: `${book}/${chapter}`, data: { lines, strongs: strongs ?? {} } });
    });
    return () => {
      live = false;
    };
  }, [book, chapter, hasInterlinear, interlinearOn]);
  // What was read for another chapter is never drawn beside this one.
  const g = greek?.key === key ? greek.data : null;

  // The commentary, read the first time a verse's commentary is opened,
  // unless the page brought it.
  const [readNotes, setReadNotes] = useState<Read<ChapterCommentary>>(null);
  const notes = commentary ?? (readNotes?.key === key ? readNotes.data : NO_NOTES);
  const openCommentary = (n: number) => {
    setOpenVerse(n);
    if (commentary || readNotes?.key === key) return;
    void loadChapterCommentary(book, chapter).then((data) => {
      if (data) setReadNotes({ key: `${book}/${chapter}`, data });
    });
  };

  // Cross-references are Plus: shown to everyone, opened for Plus, and the
  // upgrade sheet named for them for everyone else
  // (lib/entitlements/usePlusFeatures.ts). Read when one is opened.
  const [refsVerse, setRefsVerse] = useState<number | null>(null);
  const [readRefs, setReadRefs] = useState<Read<Record<number, CrossRefItem[]>>>(null);
  const refs = readRefs?.key === key ? readRefs.data : null;
  const upgrade = useUpgradeModal();
  // The Greek word study, Plus the same way. Keyed per word so each opens
  // fresh, and kept after closing so the sheet can animate away.
  const [study, setStudy] = useState<{ s: string; lemma?: string; n: number } | null>(null);
  const [studyOpen, setStudyOpen] = useState(false);
  const openStudy = (s: string, lemma?: string) => {
    void plusFeaturesNow().then((ok) => {
      if (ok === false) {
        upgrade.open("wordstudy");
        return;
      }
      setStudy((prev) => ({ s, lemma, n: (prev?.n ?? 0) + 1 }));
      setStudyOpen(true);
    });
  };
  const openRefs = (n: number) => {
    void plusFeaturesNow().then(async (ok) => {
      if (ok === false) {
        upgrade.open("crossrefs");
        return;
      }
      if (!refs) {
        const data = await loadChapterCrossRefs(book, chapter);
        if (!data) return;
        setReadRefs({ key: `${book}/${chapter}`, data });
      }
      setRefsVerse(n);
    });
  };
  return (
    <>
      <article
        className={cn(
          "text-paper/90",
          FONT_CLASSES[font],
          SIZE_CLASSES[size],
        )}
        style={leadingValue ? { lineHeight: leadingValue } : undefined}
      >
        <div className="space-y-2">
          {verses.map((v, i) => (
            <VerseRow
              key={v.n}
              book={book}
              bookName={bookName}
              chapter={chapter}
              verse={v}
              dropCap={i === 0}
              hasCommentary={has.has(v.n)}
              onOpenCommentary={
                has.has(v.n) ? () => openCommentary(v.n) : undefined
              }
              originalText={g?.lines.text[v.n]}
              originalTokens={g?.lines.tokens[v.n]}
              englishTokens={g?.lines.english[v.n]}
              strongs={g?.strongs}
              onOpenCrossRefs={hasRefs.has(v.n) ? () => openRefs(v.n) : undefined}
              onWordStudy={openStudy}
            />
          ))}
        </div>
        <HighlightLegend />
      </article>
      <WordStudySheet
        key={study?.n ?? 0}
        strongs={studyOpen && study ? study.s : null}
        lemma={study?.lemma}
        startIn={testament === "OT" ? "ot" : "nt"}
        onClose={() => setStudyOpen(false)}
      />
      <CrossRefSheet
        book={book}
        chapter={chapter}
        verse={refsVerse}
        items={refsVerse !== null ? (refs?.[refsVerse] ?? []) : []}
        onClose={() => setRefsVerse(null)}
      />
      {has.size > 0 && (
        <MobileCommentarySheet
          bookName={bookName}
          chapter={chapter}
          verse={openVerse}
          commentary={notes}
          onClose={() => setOpenVerse(null)}
        />
      )}
    </>
  );
}
