"use client";

// Remember the verse (1.7, Purify Plus; named and set out again in 1.7.1):
// one of the reader's saved verses a day, to say from memory. The card says
// what it is and what to do, then sets the verse out as its words' first
// letters, each on a small tile of its own with the verse's punctuation kept,
// so the hint reads as words to recall. The reader checks a word at a time
// ("Next word") or the whole verse ("Show the words"), then says how it went,
// "I know it" or "Not yet" (lib/remember/schedule.ts says when it comes back).
// Only when the reader has saved a verse.
//
// 1.7 drew the hint as one run of letters and underscores under a small
// "Remember" ("F__ G__ s_ l____"). The owner's note of 2026-10-17: at first
// he did not understand it, and it looked like a bunch of random text. Hence
// the name in his words, the line under it, and the tiles.
//
// A Plus feature is never hidden (the owner's rule, components/billing/
// UpgradeModal.tsx): a reader without Plus sees the card, its tiles and its
// mark, and "Show the words" opens the upgrade sheet named for it.

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { PlusLock, PlusMark } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/api/client";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import {
  INTERVALS,
  addDays,
  answer,
  dayOf,
  dueVerse,
  hintWords,
  keepText,
  textOf,
  verseKey,
  type Entry,
  type HintWord,
  type SavedVerse,
} from "@/lib/remember/schedule";

const noop = () => () => {};

/** How many words are shown, and how many were shown before the last tap. */
type Reveal = { key: string; n: number; from: number };

const PILL = "tap-press inline-flex h-11 items-center gap-1.5 rounded-pill px-4 font-sans text-caption font-semibold disabled:opacity-50";
const SOLID = "bg-paper text-night";
const QUIET = "border border-paper/20 text-paper/85";

// A word's first letter on a tile of its own. Sized in em so it follows the
// verse's type, and shorter than the line so two rows of tiles never touch.
const TILE =
  "mx-px inline-flex h-[1.6em] min-w-[1.6em] items-center justify-center rounded-[0.4em] bg-paper/[0.07] px-[0.35em] font-medium text-paper ring-1 ring-inset ring-paper/[0.12]";

// A word coming out from under its tile: it clears into place, with the
// motion switch on (a browser without @starting-style shows it at once).
const WORD_IN =
  "inline-block motion-safe:transition-[opacity,filter] motion-safe:duration-[var(--duration-base)] motion-safe:ease-[var(--ease-house)] motion-safe:starting:opacity-0 motion-safe:starting:blur-[3px]";

/** Shown together, the words come in one after another, as the verse is read. */
const STAGGER_MS = 18;
const STAGGER_MAX_MS = 360;

export function RememberCard({ className }: { className?: string }) {
  const { t } = useTranslate();
  const plus = usePlusFeatures();
  const upgrade = useUpgradeModal();
  const { bookmarks } = useBookmarks();
  // The schedule lives on the device: nothing is drawn until the page is.
  const client = useSyncExternalStore(noop, () => true, () => false);
  const [today] = useState(() => dayOf(new Date()));
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [answered, setAnswered] = useState<{ entry: Entry; knew: boolean } | null>(null);
  const [fetched, setFetched] = useState<{ key: string; text: string | null } | null>(null);
  // Keyboard focus stays in the card when the buttons under it change.
  const rowRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const regain = useRef(false);

  const saved = useMemo<SavedVerse[]>(
    () =>
      bookmarks.flatMap((b) =>
        b.kind === "bible-verse"
          ? [{ key: verseKey(b.book, b.chapter, b.verse), book: b.book, chapter: b.chapter, verse: b.verse, label: b.label, addedAt: b.addedAt }]
          : [],
      ),
    [bookmarks],
  );
  const due = useMemo(() => (client && !answered ? dueVerse(saved, today) : null), [client, answered, saved, today]);
  const kept = due ? textOf(due.key) : null;
  const text = kept ?? (fetched && due && fetched.key === due.key ? fetched.text : null);
  const words = useMemo(() => (text ? hintWords(text) : []), [text]);
  const said = useMemo(() => words.filter((w) => w.word).map((w) => w.lead + w.word + w.tail), [words]);
  const step = reveal && due && reveal.key === due.key ? reveal : { n: 0, from: 0 };
  const done = said.length > 0 && step.n >= said.length;

  // The words, the first time: from the website, then kept on the device.
  useEffect(() => {
    if (!due || kept) return;
    let cancelled = false;
    apiFetch(`/api/bible/verse?book=${encodeURIComponent(due.book)}&chapter=${due.chapter}&verse=${due.verse}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { verses?: { text: string }[] } | null) => {
        const verseText = json?.verses?.map((v) => v.text).join(" ") ?? null;
        if (verseText) keepText(due.key, verseText);
        if (!cancelled) setFetched({ key: due.key, text: verseText });
      })
      .catch(() => {
        if (!cancelled) setFetched({ key: due.key, text: null });
      });
    return () => {
      cancelled = true;
    };
  }, [due, kept]);

  useEffect(() => {
    if (!regain.current) return;
    if (answered) statusRef.current?.focus();
    else if (done) rowRef.current?.querySelector("button")?.focus();
    else return;
    regain.current = false;
  }, [answered, done]);

  if (!client || (!due && !answered)) return null;
  const books = localBookNames(t);
  const locked = plus === false;
  const back = answered
    ? answered.entry.box > INTERVALS.length
      ? t("remember.known")
      : answered.entry.due === addDays(today, 1)
        ? t("remember.backTomorrow")
        : t("remember.backIn", { count: Math.round((Date.parse(answered.entry.due) - Date.parse(today)) / 86_400_000) })
    : null;

  // Only when the buttons the reader is on are about to be replaced.
  const holdFocus = () => {
    regain.current = rowRef.current?.contains(document.activeElement) ?? false;
  };
  const showTo = (n: number) => {
    if (!due) return;
    const next = Math.min(n, said.length);
    if (next >= said.length) holdFocus();
    setReveal({ key: due.key, n: next, from: step.n });
  };
  const reply = (knew: boolean) => {
    if (!due) return;
    holdFocus();
    setAnswered({ entry: answer(due.key, knew, today), knew });
  };

  return (
    <section aria-labelledby="remember-title" className={cn("rounded-2xl border border-paper/10 bg-paper/[0.03] p-4", className)}>
      <p id="remember-title" className="font-heading text-title-sm font-semibold leading-tight text-paper">
        {t("remember.title")}
      </p>

      {back ? (
        <p ref={statusRef} tabIndex={-1} role="status" className="mt-2 flex items-center gap-2 font-sans text-ui text-paper/75 outline-none">
          {answered?.knew ? <Check size={16} className="check-draw shrink-0" /> : null}
          {back}
        </p>
      ) : due ? (
        <>
          <p className="mt-1 font-sans text-detail leading-snug text-paper/65">{t("remember.line")}</p>

          {/* The mark sits on the reference's row, where it leaves the
              title one line on the narrowest phone. */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <Link
              href={`/bible/${due.book}/${due.chapter}#v${due.verse}`}
              className="tap-press hit-44 inline-block font-sans text-detail font-semibold text-paper/80"
            >
              {referenceIn(due.label, due.book, books)}
            </Link>
            {locked ? <PlusMark className="shrink-0" /> : null}
          </div>

          {/* Tall lines while tiles stand in them; the verse's own once it is all shown. */}
          {text ? (
            <p className={cn("mt-1 font-serif text-body text-paper/90", done ? "leading-[1.6]" : "leading-[2.05]")} dir="auto">
              <VerseWords words={words} n={step.n} from={step.from} />
            </p>
          ) : fetched ? (
            <p className="mt-2 font-sans text-detail italic text-paper/50">{t("remember.offline")}</p>
          ) : (
            <div aria-hidden className="mt-3 space-y-3 pb-1">
              <Skeleton className="h-5 w-full" weight="faint" />
              <Skeleton className="h-5 w-2/3" weight="faint" />
            </div>
          )}

          {/* What a tap shows, said for a screen reader. */}
          <p aria-live="polite" className="sr-only">
            {step.n > step.from ? said.slice(step.from, step.n).join(" ") : ""}
          </p>

          {text || !fetched ? (
            <div ref={rowRef} className="mt-3 flex flex-wrap items-center gap-2">
              {locked ? (
                <button type="button" disabled={!text} onClick={() => upgrade.open("remember")} className={cn(PILL, SOLID)}>
                  {t("remember.show")}
                  <PlusLock size={13} />
                </button>
              ) : done ? (
                <>
                  <button type="button" onClick={() => reply(false)} className={cn(PILL, QUIET)}>
                    {t("remember.notYet")}
                  </button>
                  <button type="button" onClick={() => reply(true)} className={cn(PILL, QUIET)}>
                    <Check size={15} className="shrink-0" />
                    {t("remember.knew")}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" disabled={!text} onClick={() => showTo(step.n + 1)} className={cn(PILL, QUIET)}>
                    {t("remember.nextWord")}
                  </button>
                  <button type="button" disabled={!text} onClick={() => showTo(said.length)} className={cn(PILL, SOLID)}>
                    {t("remember.show")}
                  </button>
                </>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

/** The verse as its words: the first `n` shown, the rest as first-letter tiles. */
function VerseWords({ words, n, from }: { words: HintWord[]; n: number; from: number }) {
  const out: ReactNode[] = [];
  let index = 0;
  for (const [i, w] of words.entries()) {
    const gap = i ? " " : null;
    if (!w.word) {
      out.push(
        <Fragment key={i}>
          {gap}
          {w.lead}
        </Fragment>,
      );
      continue;
    }
    const open = index < n;
    const delay = open && index >= from ? Math.min((index - from) * STAGGER_MS, STAGGER_MAX_MS) : 0;
    index += 1;
    out.push(
      <Fragment key={i}>
        {gap}
        <span className={cn("whitespace-nowrap", !open && "text-paper/55")}>
          {w.lead}
          {open ? (
            <span key="word" className={WORD_IN} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
              {w.word}
            </span>
          ) : (
            <span key="tile" className={TILE}>
              {w.first}
            </span>
          )}
          {w.tail}
        </span>
      </Fragment>,
    );
  }
  return out;
}
