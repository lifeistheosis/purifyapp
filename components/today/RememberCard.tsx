"use client";

// Remember the verse (1.7, Purify Plus; set out again in 1.7.1 and 1.8): one
// of the reader's saved verses a day, to say from memory. Only when the
// reader has saved a verse.
//
// 1.8, the owner's "a mix of A and B with a good design" of round 16
// (Homebase/boards/purify-master/r18/choose/16b-remember-AB.png): the light
// card of the Verse of the Day (his pick B of round 10) with the saved
// verse's reference large, and the verse with some of its words left blank:
// the longer words, the same ones every time for that verse
// (lib/remember/blanks.ts). "Say the missing words, then check." Show the
// words lights the blanked words up white; Hide puts the blanks back. "I know
// it" says it is known; once the words are shown, "Not yet" brings it back
// tomorrow (lib/remember/schedule.ts says when it comes back).
//
// Before 1.8 every word was a tile with its first letter on it, and a word
// could be shown one at a time ("Next word"): the blanks leave the verse
// readable and ask only for the words that carry it.
//
// A Plus feature is never hidden (the owner's rule, components/billing/
// UpgradeModal.tsx): a reader without Plus sees the card, its blanks and its
// name, and "Show the words" opens the upgrade sheet named for it.

import Link from "next/link";
import { Fragment, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { PlusLock } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/api/client";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { blankedWords, type BlankedWord } from "@/lib/remember/blanks";
import {
  INTERVALS,
  addDays,
  answer,
  dayOf,
  dueVerse,
  keepText,
  textOf,
  verseKey,
  type Entry,
  type SavedVerse,
} from "@/lib/remember/schedule";

const noop = () => () => {};

const PILL = "tap-press inline-flex h-11 items-center gap-1.5 rounded-pill px-[18px] font-sans text-ui font-semibold disabled:opacity-50";
const SOLID = "bg-paper text-night";
const QUIET = "border border-paper/20 text-paper";

// A blank: the word is there but unseen, so the line does not move when it
// is shown, over a line where it goes. Shown, it lights up white, with the
// motion switch on (lib/ui/motion.ts) as a fade.
const BLANK =
  "inline-block border-b-[1.5px] border-paper/70 leading-[1.15] motion-safe:transition-[color,text-shadow] motion-safe:duration-[var(--duration-base)] motion-safe:ease-[var(--ease-house)]";

export function RememberCard({ className }: { className?: string }) {
  const { t } = useTranslate();
  const plus = usePlusFeatures();
  const upgrade = useUpgradeModal();
  const { bookmarks } = useBookmarks();
  // The schedule lives on the device: nothing is drawn until the page is.
  const client = useSyncExternalStore(noop, () => true, () => false);
  const [today] = useState(() => dayOf(new Date()));
  const [shownFor, setShownFor] = useState<string | null>(null);
  const [answered, setAnswered] = useState<{ entry: Entry; knew: boolean } | null>(null);
  const [fetched, setFetched] = useState<{ key: string; text: string | null } | null>(null);

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
  const shown = Boolean(due && shownFor === due.key);

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

  if (!client || (!due && !answered)) return null;
  const books = localBookNames(t);

  return (
    <RememberCardView
      className={className}
      reference={due ? referenceIn(due.label, due.book, books) : ""}
      href={due ? `/bible/${due.book}/${due.chapter}#v${due.verse}` : undefined}
      text={text}
      failed={Boolean(fetched) && !text}
      shown={shown}
      back={answered ? backWords(t, answered.entry, today) : null}
      knew={answered?.knew ?? false}
      locked={plus === false}
      onShow={(open) => {
        if (due) setShownFor(open ? due.key : null);
      }}
      onReply={(knew) => {
        if (due) setAnswered({ entry: answer(due.key, knew, today), knew });
      }}
      onLocked={() => upgrade.open("remember")}
    />
  );
}

/** When an answered verse comes back, in the reader's language: tomorrow, in some days, or once a month once known. */
export function backWords(t: (key: string, values?: Record<string, string | number>) => string, entry: Entry, today: string): string {
  if (entry.box > INTERVALS.length) return t("remember.known");
  if (entry.due === addDays(today, 1)) return t("remember.backTomorrow");
  return t("remember.backIn", { count: Math.round((Date.parse(entry.due) - Date.parse(today)) / 86_400_000) });
}

/**
 * The card itself, as Today draws it: the reference large, the verse with
 * its blanks, and Show the words, Not yet and I know it. Drawn from what it
 * is given, so the card on Today and the Plus page's preview of Remember the
 * verse (components/billing/plusTry/TryRemember.tsx) are the one card.
 */
export function RememberCardView({
  reference,
  href,
  text,
  failed,
  shown,
  back,
  knew,
  locked,
  onShow,
  onReply,
  onLocked,
  badge,
  className,
}: {
  /** The verse's reference, as the reader's language writes it. */
  reference: string;
  /** Where the reference leads; with none it is not a link. */
  href?: string;
  /** The verse's words, or null while they come (or when they could not). */
  text: string | null;
  /** The words could not be read (no signal the first time). */
  failed: boolean;
  /** The blanked words are shown. */
  shown: boolean;
  /** Once answered: when the verse comes back. */
  back: string | null;
  /** The answer was "I know it". */
  knew: boolean;
  /** No Plus: Show the words carries the lock and opens the upgrade sheet. */
  locked: boolean;
  onShow: (open: boolean) => void;
  onReply: (knew: boolean) => void;
  onLocked: () => void;
  /** Beside the card's name: a mark the place showing it adds (the preview's Example). */
  badge?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslate();
  const words = useMemo(() => (text ? blankedWords(text) : []), [text]);
  // Keyboard focus stays in the card when the buttons under it change.
  const rowRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const regain = useRef(false);
  // Its own name: Today and the Plus page's preview may both draw one.
  const titleId = useId();

  useEffect(() => {
    if (!regain.current) return;
    regain.current = false;
    if (back) statusRef.current?.focus();
    else rowRef.current?.querySelector("button")?.focus();
  }, [back, shown]);

  // Only when the buttons the reader is on are about to be replaced.
  const holdFocus = () => {
    regain.current = rowRef.current?.contains(document.activeElement) ?? false;
  };
  const show = (open: boolean) => {
    holdFocus();
    onShow(open);
  };
  const reply = (answer: boolean) => {
    holdFocus();
    onReply(answer);
  };

  return (
    <section
      aria-labelledby={titleId}
      className={cn("lm-card relative overflow-hidden rounded-[24px] border border-paper/10 bg-night-deep px-5 pb-[18px] pt-[22px] text-center", className)}
    >
      {/* The Verse of the Day's light, behind the words. */}
      <span aria-hidden className="verse-light pointer-events-none absolute left-1/2 top-[-120px] h-[300px] w-[380px] -translate-x-1/2" />
      <div className="relative">
        <p id={titleId} className="font-sans text-[12.5px] font-semibold text-paper/60">
          {t("remember.title")}
          <span className="text-paper/45"> · {t("plus.badge")}</span>
          {badge}
        </p>

        {back ? (
          <p ref={statusRef} tabIndex={-1} role="status" className="mt-3 flex items-center justify-center gap-2 font-sans text-ui text-paper/75 outline-none">
            {knew ? <Check size={16} className="check-draw shrink-0" /> : null}
            {back}
          </p>
        ) : (
          <>
            {href ? (
              <Link href={href} className="tap-press mt-2 inline-block font-heading text-[24px] font-bold leading-tight text-paper">
                {reference}
              </Link>
            ) : (
              <p className="mt-2 font-heading text-[24px] font-bold leading-tight text-paper">{reference}</p>
            )}

            {text ? (
              <>
                <p className="mt-2.5 font-serif text-[18px] leading-[1.62] text-paper/90" dir="auto">
                  <BlankedVerse words={words} shown={shown} blank={t("remember.blank")} />
                </p>
                <p className="mt-2 font-sans text-caption text-paper/50">{t("remember.lineBlanks")}</p>
              </>
            ) : failed ? (
              <p className="mt-2 font-sans text-detail italic text-paper/50">{t("remember.offline")}</p>
            ) : (
              <div aria-hidden className="mt-3 space-y-3 pb-1">
                <Skeleton className="mx-auto h-5 w-full" weight="faint" />
                <Skeleton className="mx-auto h-5 w-2/3" weight="faint" />
              </div>
            )}

            {/* What Show the words lights up, said for a screen reader. */}
            <p aria-live="polite" className="sr-only">
              {shown ? words.filter((w) => w.blank).map((w) => w.word).join(", ") : ""}
            </p>

            {text || !failed ? (
              <div ref={rowRef} className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {locked ? (
                  <button type="button" disabled={!text} onClick={onLocked} className={cn(PILL, SOLID)}>
                    {t("remember.show")}
                    <PlusLock size={13} />
                  </button>
                ) : shown ? (
                  <>
                    <button type="button" onClick={() => show(false)} className={cn(PILL, QUIET)}>
                      {t("remember.hide")}
                    </button>
                    <button type="button" onClick={() => reply(false)} className={cn(PILL, QUIET)}>
                      {t("remember.notYet")}
                    </button>
                    <button type="button" onClick={() => reply(true)} className={cn(PILL, SOLID)}>
                      {t("remember.knew")}
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={!text} onClick={() => show(true)} className={cn(PILL, QUIET)}>
                      {t("remember.show")}
                    </button>
                    <button type="button" disabled={!text} onClick={() => reply(true)} className={cn(PILL, SOLID)}>
                      {t("remember.knew")}
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

/** The verse with its blanks: each blanked word unseen over its line, lit white once shown. */
function BlankedVerse({ words, shown, blank }: { words: BlankedWord[]; shown: boolean; blank: string }) {
  return words.map((w, i) => (
    <Fragment key={i}>
      {i ? " " : null}
      {w.blank ? (
        <span className="whitespace-nowrap">
          {w.lead}
          <span className={cn(BLANK, shown ? "remember-lit text-paper" : "select-none text-transparent")}>
            <span aria-hidden={shown ? undefined : true}>{w.word}</span>
            {shown ? null : <span className="sr-only">{blank}</span>}
          </span>
          {w.tail}
        </span>
      ) : (
        <>
          {w.lead}
          {w.word}
          {w.tail}
        </>
      )}
    </Fragment>
  ));
}
