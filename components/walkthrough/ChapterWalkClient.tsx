"use client";

// One chapter of a walkthrough (1.7, the owner's note 24 of 2026-10-16: "good
// concept, but the execution feels vibe coded", the star, the animations, the
// drawings and the line). The Scripture is the page: the verses in the
// reader's own font and size (components/reader/ReaderPrefs.tsx), and under a
// verse that carries a note, the note's name, which opens it in the movable
// sheet. Nothing rises by itself while the reader reads.
//
// The guided flow around the text: under the bar, where the reader is in the
// book and a line that fills as the chapter is read (./WalkProgress.tsx); at
// the end, three short steps that gather the chapter up and a quiet finish
// with the way on (./Synthesis.tsx); and at the foot, the chapters either
// side.
//
// A note kept in Saved links here as #card-<id>, which opens it on arrival.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FONT_CLASSES, SIZE_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Info } from "@/components/ui/icons/Info";
import { cn } from "@/lib/cn";
import { todayKey } from "@/lib/rhythm/dayKey";
import { nextChapter, recordComplete, recordOpen, recordVisit, walkStreak } from "@/lib/walkthroughs/progress";
import type { ChapterWalk, ContextCard } from "@/lib/walkthroughs/types";
import { useWalkProgress } from "@/lib/walkthroughs/useWalkProgress";

import type { WalkChapter, WalkMovement } from "./ChapterList";
import { Synthesis } from "./Synthesis";
import { WalkProgress } from "./WalkProgress";
import { ChaptersSheet, NoteSheet } from "./WalkSheets";

export type WalkMeta = {
  book: string;
  /** The book's name as the walk's data has it ("Job"), kept with a saved note. */
  bookName: string;
  title: string;
  fatherSource: string;
  movementTitle: string;
  total: number;
  movements: WalkMovement[];
  /** The chapters written so far, with their titles, for the Chapters sheet. */
  chapters: WalkChapter[];
};

/** A note's name under its verse: the way into the note's sheet. */
function NoteDoor({ note, opened, onOpen }: { note: ContextCard; opened: boolean; onOpen: () => void }) {
  const { t } = useTranslate();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={t("walk.noteLabel", { verse: note.verse, title: note.title })}
      data-walk-note={note.id}
      className={cn(
        "tap-press -ms-1 mt-0.5 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-pill px-1 text-start font-sans text-detail font-semibold leading-snug hover:text-paper",
        // A note read before is quieter, as a link once followed is.
        opened ? "text-paper/50" : "text-paper/75",
      )}
    >
      <Info size={16} className="shrink-0" />
      <span lang="en" className="min-w-0">
        {note.title}
      </span>
    </button>
  );
}

export function ChapterWalkClient({
  meta,
  walk,
  verses,
  prev,
  next,
}: {
  meta: WalkMeta;
  walk: ChapterWalk;
  verses: { n: number; text: string }[];
  prev: number | null;
  next: number | null;
}) {
  const { t } = useTranslate();
  const { font, size, leadingValue } = useReaderPrefs();
  const progress = useWalkProgress(meta.book);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);

  const byVerse = useMemo(() => new Map(walk.cards.map((c) => [c.verse, c])), [walk.cards]);
  const verseText = useMemo(() => new Map(verses.map((v) => [v.n, v.text])), [verses]);
  const note = noteId ? (walk.cards.find((c) => c.id === noteId) ?? null) : null;
  const walked = useMemo(() => new Set(Object.keys(progress.done).map(Number)), [progress.done]);
  const upNext = nextChapter(progress, meta.total);
  const streak = walkStreak(progress, todayKey());
  const finishedAt = progress.done[String(walk.n)] ?? null;
  // The book's name in the reader's language, for the eye: "Job 3".
  const bookLabel = t(`bible.books.${meta.book}`);
  const reference = `${bookLabel} ${walk.n}`;

  useEffect(() => {
    recordVisit(meta.book, walk.n);
  }, [meta.book, walk.n]);

  const openNote = useCallback(
    (c: ContextCard) => {
      setNoteId(c.id);
      setNoteOpen(true);
      // Opening a note is walking: it counts the day.
      recordOpen(meta.book, c.id, todayKey());
    },
    [meta.book],
  );

  // A note kept in Saved links here as #card-<id>: its verse comes into view,
  // then the note opens over it.
  useEffect(() => {
    const m = /^#card-(.+)$/.exec(window.location.hash);
    if (!m) return;
    const c = walk.cards.find((x) => x.id === decodeURIComponent(m[1]));
    if (!c) return;
    document.getElementById(`v${c.verse}`)?.scrollIntoView({ block: "center" });
    const timer = window.setTimeout(() => openNote(c), 350);
    return () => window.clearTimeout(timer);
  }, [walk.cards, openNote]);

  return (
    <section className="bg-night px-5 pb-16 md:px-8" aria-labelledby="walk-chapter-title">
      <div className="mx-auto w-full max-w-[680px]">
        <WalkProgress n={walk.n} total={meta.total} movement={meta.movementTitle} onChapters={() => setChaptersOpen(true)} />

        <header className="pt-6">
          <h1
            id="walk-chapter-title"
            lang="en"
            className="text-title font-bold leading-[1.15] tracking-[-0.01em] text-paper text-balance"
          >
            {walk.title}
          </h1>
          <p className="mt-2 font-sans text-detail text-paper/55">{reference}</p>
        </header>

        <ol
          data-walk-text
          className={cn("mt-8 space-y-3 text-paper/90", FONT_CLASSES[font], SIZE_CLASSES[size])}
          style={leadingValue ? { lineHeight: leadingValue } : undefined}
        >
          {verses.map((v) => {
            const c = byVerse.get(v.n);
            return (
              <li key={v.n} id={`v${v.n}`} className="scroll-mt-32">
                <p lang="en">
                  <sup className="me-1.5 font-sans text-eyebrow font-medium text-paper/55">{v.n}</sup>
                  {v.text}
                </p>
                {c ? <NoteDoor note={c} opened={progress.opened.includes(c.id)} onOpen={() => openNote(c)} /> : null}
              </li>
            );
          })}
        </ol>

        <Synthesis
          book={meta.book}
          chapter={walk.n}
          walk={walk}
          verses={verseText}
          finishedAt={finishedAt}
          savedText={progress.ledger[String(walk.n)]?.text ?? ""}
          streak={streak}
          nextChapter={next}
          walkedAll={upNext === null}
          onComplete={(text) => recordComplete(meta.book, walk.n, text, todayKey())}
        />

        <nav
          className="mt-14 flex items-center justify-between gap-3 border-t border-paper/[0.08] pt-5"
          aria-label={t("walk.chapterNav")}
        >
          {prev ? (
            <Link
              href={`/walkthroughs/${meta.book}/${prev}`}
              className="tap-press -ms-2 inline-flex min-h-11 items-center gap-1 rounded-pill px-3 font-sans text-ui font-semibold text-paper/70 hover:text-paper"
            >
              <ChevronLeft size={16} className="shrink-0 rtl:-scale-x-100" />
              {t("walk.chapterN", { n: prev })}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/walkthroughs/${meta.book}/${next}`}
              className="tap-press -me-2 inline-flex min-h-11 items-center gap-1 rounded-pill px-3 font-sans text-ui font-semibold text-paper/70 hover:text-paper"
            >
              {t("walk.chapterN", { n: next })}
              <ChevronRight size={16} className="shrink-0 rtl:-scale-x-100" />
            </Link>
          ) : null}
        </nav>
      </div>

      <NoteSheet
        open={noteOpen}
        note={note}
        book={meta.book}
        bookName={meta.bookName}
        bookLabel={bookLabel}
        chapter={walk.n}
        fatherSource={meta.fatherSource}
        onClose={() => setNoteOpen(false)}
      />
      <ChaptersSheet
        open={chaptersOpen}
        onClose={() => setChaptersOpen(false)}
        book={meta.book}
        movements={meta.movements}
        chapters={meta.chapters}
        walked={walked}
        next={upNext}
        current={walk.n}
      />
    </section>
  );
}
