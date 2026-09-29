"use client";

// One chapter of a walkthrough. The verses read in the reader's own font and
// size (components/reader/ReaderPrefs.tsx). Beside the verses that carry a
// card sits a quiet glyph in the margin, which never moves the text ("a
// subtle, low-contrast glyph appears beside critical verses without
// disrupting text layout"). When the reader pauses with such a verse in the
// middle of the screen, its card peeks up from the bottom; tapping the glyph
// or the peek opens it. The chapter ends in the synthesis.
//
// A saved card links here as #card-<id>, which opens it on arrival.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FONT_CLASSES, ReaderPrefsProvider, SIZE_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { Lampada } from "@/components/ui/icons/Lampada";
import { cn } from "@/lib/cn";
import { todayKey } from "@/lib/rhythm/dayKey";
import { recordComplete, recordOpen, recordVisit, walkStreak } from "@/lib/walkthroughs/progress";
import type { ChapterWalk, ContextCard } from "@/lib/walkthroughs/types";
import { useWalkProgress } from "@/lib/walkthroughs/useWalkProgress";
import { ContextSheet, type SheetMode } from "./ContextSheet";
import { Synthesis } from "./Synthesis";
import { requestTiltPermission } from "./useTilt";

export type WalkMeta = {
  book: string;
  bookName: string;
  title: string;
  fatherSource: string;
  movementTitle: string;
  total: number;
};

/** How long the page must rest before a card peeks. */
const PAUSE_MS = 900;
const ARROW_BACK = "←";
const ARROW_ON = "→";

function Glyph({ opened }: { opened: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden className={cn("walk-glyph-mark", opened && "is-opened")}>
      <path
        d="M8 1.5 C8.6 5.6 10.4 7.4 14.5 8 C10.4 8.6 8.6 10.4 8 14.5 C7.4 10.4 5.6 8.6 1.5 8 C5.6 7.4 7.4 5.6 8 1.5 Z"
        fill={opened ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Body({
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
  const { t, tn } = useTranslate();
  const { font, size, leadingValue } = useReaderPrefs();
  const progress = useWalkProgress(meta.book);
  const [active, setActive] = useState<{ id: string; mode: Exclude<SheetMode, null> } | null>(null);
  const dismissed = useRef<Set<string>>(new Set());
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const byVerse = useMemo(() => new Map(walk.cards.map((c) => [c.verse, c])), [walk.cards]);
  const verseText = useMemo(() => new Map(verses.map((v) => [v.n, v.text])), [verses]);
  const card: ContextCard | null = active ? walk.cards.find((c) => c.id === active.id) ?? null : null;
  const today = todayKey();
  const streak = walkStreak(progress, today);
  const finishedAt = progress.done[String(walk.n)] ?? null;

  useEffect(() => {
    recordVisit(meta.book, walk.n);
  }, [meta.book, walk.n]);

  const openCard = useCallback(
    (c: ContextCard) => {
      requestTiltPermission();
      setActive({ id: c.id, mode: "open" });
      recordOpen(meta.book, c.id, todayKey());
    },
    [meta.book],
  );

  const close = useCallback(() => {
    const a = activeRef.current;
    if (a?.mode === "peek") dismissed.current.add(a.id);
    setActive(null);
  }, []);

  // A saved card links here as #card-<id>.
  useEffect(() => {
    const m = /^#card-(.+)$/.exec(window.location.hash);
    if (!m) return;
    const c = walk.cards.find((x) => x.id === decodeURIComponent(m[1]));
    if (!c) return;
    document.getElementById(`v${c.verse}`)?.scrollIntoView({ block: "center" });
    const timer = window.setTimeout(() => openCard(c), 350);
    return () => window.clearTimeout(timer);
  }, [walk.cards, openCard]);

  // Pause to peek: once the page has rested, a card whose verse sits in the
  // middle band of the screen lifts its hook; scrolling it away lets it sink.
  useEffect(() => {
    let timer = 0;
    const inBand = (verse: number) => {
      const el = document.getElementById(`v${verse}`);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const h = window.innerHeight;
      return r.top < h * 0.68 && r.bottom > h * 0.22;
    };
    const settle = () => {
      const a = activeRef.current;
      if (a?.mode === "open") return;
      if (a?.mode === "peek") {
        const c = walk.cards.find((x) => x.id === a.id);
        if (c && !inBand(c.verse)) setActive(null);
        return;
      }
      const c = walk.cards.find((x) => !dismissed.current.has(x.id) && inBand(x.verse));
      if (c) setActive({ id: c.id, mode: "peek" });
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, PAUSE_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, [walk.cards]);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-6 md:pt-10">
      <Link
        href={`/walkthroughs/${meta.book}`}
        className="inline-flex min-h-11 items-center gap-2 font-sans text-caption text-paper/60 transition-colors hover:text-paper"
      >
        <span aria-hidden>{ARROW_BACK}</span>
        {meta.title}
      </Link>

      <header className="walk-head mt-2">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-premium-ink">
          {t("walk.chapterEyebrow", { movement: meta.movementTitle, n: walk.n, total: meta.total })}
        </p>
        <h1 className="mt-2 text-title font-bold leading-tight text-paper">{walk.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="inline-flex items-center gap-2 font-sans text-caption text-paper/55">
            <span className="text-premium-ink">
              <Glyph opened={false} />
            </span>
            {t("walk.glyphHint")}
          </p>
          {streak > 0 ? (
            <p className="inline-flex items-center gap-1.5 font-sans text-caption text-paper/70">
              <Lampada size={14} />
              {tn("walk.streakDays", streak)}
            </p>
          ) : null}
        </div>
      </header>

      <ol
        className={cn("walk-verses mt-8 space-y-3 text-paper/90", FONT_CLASSES[font], SIZE_CLASSES[size])}
        style={leadingValue ? { lineHeight: leadingValue } : undefined}
      >
        {verses.map((v) => {
          const c = byVerse.get(v.n);
          const opened = c ? progress.opened.includes(c.id) : false;
          const isActive = !!c && active?.id === c.id;
          return (
            <li key={v.n} id={`v${v.n}`} className={cn("walk-verse relative scroll-mt-28 pl-8", isActive && "is-active")}>
              {c ? (
                <button
                  type="button"
                  onClick={() => openCard(c)}
                  aria-label={t("walk.glyphLabel", { verse: v.n, title: c.title })}
                  className="walk-glyph absolute -left-2.5 -top-1.5 inline-flex size-11 items-center justify-center rounded-full text-premium-ink/70 transition-colors hover:text-premium-ink"
                >
                  <Glyph opened={opened} />
                </button>
              ) : null}
              <sup className="mr-1.5 font-sans text-eyebrow font-medium tracking-[0.05em] text-paper/45">{v.n}</sup>
              <span className="walk-verse-text">{v.text}</span>
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
        onComplete={(text) => recordComplete(meta.book, walk.n, text, todayKey())}
      />

      <nav className="mt-12 flex items-center justify-between gap-3 border-t border-paper/10 pt-5" aria-label={t("walk.chapterNav")}>
        {prev ? (
          <Link
            href={`/walkthroughs/${meta.book}/${prev}`}
            className="inline-flex min-h-11 items-center gap-2 font-sans text-caption text-paper/65 transition-colors hover:text-paper"
          >
            <span aria-hidden>{ARROW_BACK}</span>
            {t("walk.chapterN", { n: prev })}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/walkthroughs/${meta.book}/${next}`}
            className="inline-flex min-h-11 items-center gap-2 font-sans text-caption text-paper/65 transition-colors hover:text-paper"
          >
            {t("walk.chapterN", { n: next })}
            <span aria-hidden>{ARROW_ON}</span>
          </Link>
        ) : null}
      </nav>

      <ContextSheet
        card={card}
        mode={active?.mode ?? null}
        book={meta.book}
        bookName={meta.bookName}
        chapter={walk.n}
        fatherSource={meta.fatherSource}
        onOpen={() => card && openCard(card)}
        onClose={close}
      />
    </div>
  );
}

export function ChapterWalkClient(props: {
  meta: WalkMeta;
  walk: ChapterWalk;
  verses: { n: number; text: string }[];
  prev: number | null;
  next: number | null;
}) {
  return (
    <ReaderPrefsProvider>
      <Body {...props} />
    </ReaderPrefsProvider>
  );
}
