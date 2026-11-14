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
// Since build 93 note 11 the card asks whatever the reader is learning
// (lib/remember/items.ts): a saved verse, a verse taken by its place, a quote
// from a text the app carries, under whose words they are, or their own
// words, named as theirs. The one they chose is asked first when it is new or
// due (lib/remember/schedule.ts, askedOn), and "Change" under the card opens
// the sheet that chooses (components/learn/ChooseSheet.tsx), at any time.
//
// A Plus feature is never hidden (the owner's rule, components/billing/
// UpgradeModal.tsx): a reader without Plus sees the card, its blanks and its
// name, and "Show the words" opens the upgrade sheet named for it.

import Link from "next/link";
import { Fragment, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { PlusLock } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useLearnSheets } from "@/components/learn/LearnSheets";
import { Check } from "@/components/ui/icons/Check";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/api/client";
import { localBookNames } from "@/lib/bible/books";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { stepWords, type BlankedWord } from "@/lib/remember/blanks";
import { textDir } from "@/lib/i18n/textDir";
import { learnName, useLearning } from "@/lib/remember/useLearning";
import {
  answer,
  askedOn,
  backWords,
  dayOf,
  keepText,
  stepOf,
  rememberStore,
  type Entry,
  type RememberStep,
} from "@/lib/remember/schedule";

const noop = () => () => {};

const PILL = "tap-press inline-flex h-11 items-center gap-1.5 rounded-pill px-[18px] font-sans text-ui font-semibold disabled:opacity-50";
// Rule 1 of the fifteen screens (1.9): Today holds one white button, the
// lead's Begin, so the card's answer is the quiet outlined button.
const SOLID = "border border-paper/22 bg-paper/[0.03] text-paper";
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
  const { list, store, saved } = useLearning();
  const learn = useLearnSheets();
  // The schedule lives on the device: nothing is drawn until the page is.
  const client = useSyncExternalStore(noop, () => true, () => false);
  const [today] = useState(() => dayOf(new Date()));
  // Answered before this visit: Today is left clear, as it was. Answered during it, here or in the sheet, the card says when it comes back.
  const [doneAtOpen] = useState(() => rememberStore().answeredOn === dayOf(new Date()));
  const [shownFor, setShownFor] = useState<string | null>(null);
  const [knewKey, setKnewKey] = useState<string | null>(null);
  const [fetched, setFetched] = useState<{ key: string; text: string | null } | null>(null);

  const answeredKey = store.answeredOn === today ? store.answeredKey : undefined;
  const answeredEntry: Entry | undefined = answeredKey ? store.entries[answeredKey] : undefined;
  const back = !doneAtOpen && answeredEntry ? backWords(t, answeredEntry, today) : null;
  const due = useMemo(
    () => (client && store.answeredOn !== today ? askedOn(list, store.entries, store.chosen?.key || undefined, today) : null),
    [client, list, store, today],
  );
  const verse = due?.kind === "verse" ? due : null;
  // A verse's words are kept beside the schedule once fetched; a quote's and the reader's own are the item.
  const kept = due ? (due.kind === "verse" ? (store.texts[due.key] ?? null) : due.text) : null;
  // 1.9: missing words, first letters, then from memory, as it moves up its boxes.
  const step = due ? stepOf(store.entries[due.key]?.box ?? 0) : 1;
  const text = kept ?? (fetched && due && fetched.key === due.key ? fetched.text : null);
  const shown = Boolean(due && shownFor === due.key);

  // A verse's words, the first time: from the website, then kept on the device.
  useEffect(() => {
    if (!verse || kept) return;
    let cancelled = false;
    apiFetch(`/api/bible/verse?book=${encodeURIComponent(verse.book)}&chapter=${verse.chapter}&verse=${verse.verse}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { verses?: { text: string }[] } | null) => {
        const verseText = json?.verses?.map((v) => v.text).join(" ") ?? null;
        if (verseText) keepText(verse.key, verseText);
        if (!cancelled) setFetched({ key: verse.key, text: verseText });
      })
      .catch(() => {
        if (!cancelled) setFetched({ key: verse.key, text: null });
      });
    return () => {
      cancelled = true;
    };
  }, [verse, kept]);

  if (!client || (!due && !back)) return null;
  const books = localBookNames(t);

  return (
    <>
      <RememberCardView
        className={className}
        // "Remember the verse" is a verse's name; a quote and the reader's own words are learned by heart.
        title={due && due.kind !== "verse" ? t("you.verse.learn") : undefined}
        reference={due ? learnName(due, t, books) : ""}
        referenceLang={due?.kind === "quote" ? "en" : undefined}
        href={due ? (due.kind === "verse" ? `/bible/${due.book}/${due.chapter}#v${due.verse}` : due.kind === "quote" ? due.cite.href : undefined) : undefined}
        text={text}
        // A quote is the edition's English; a verse kept from a downloaded Bible, and the reader's own words, run as they are written.
        textLang={due?.kind === "quote" ? "en" : due?.kind === "own" || kept ? null : "en"}
        step={step}
        // "A verse you saved" only of a verse that is saved.
        plainLine={Boolean(due && !saved.has(due.key))}
        failed={Boolean(fetched) && !text}
        shown={shown}
        back={back}
        knew={Boolean(answeredKey && knewKey === answeredKey)}
        locked={plus === false}
        onShow={(open) => {
          if (due) setShownFor(open ? due.key : null);
        }}
        onReply={(knew) => {
          if (!due) return;
          setKnewKey(knew ? due.key : null);
          answer(due.key, knew, today);
        }}
        onLocked={() => upgrade.open("remember")}
        onChange={learn.change}
      />
      {learn.sheets}
    </>
  );
}

/**
 * The card itself, as Today draws it: the reference large, the verse with
 * its blanks, and Show the words, Not yet and I know it. Drawn from what it
 * is given, so the card on Today and the Plus page's preview of Remember the
 * verse (components/billing/plusTry/TryRemember.tsx) are the one card.
 */
export function RememberCardView({
  title,
  reference,
  referenceLang,
  href,
  text,
  textLang = "en",
  step = 1,
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
  plainLine = false,
  onChange,
}: {
  /** The card's name; "Remember the verse" unless said (a quote and the reader's own words are "Learn by heart"). */
  title?: string;
  /** The verse's reference, as the reader's language writes it; for a quote, whose words they are; for the reader's own words, that they are theirs. */
  reference: string;
  /** The reference's language when it is not the reader's (a Father's name, as the edition has it). */
  referenceLang?: string;
  /** Where the reference leads; with none it is not a link. */
  href?: string;
  /** The verse's words, or null while they come (or when they could not). */
  text: string | null;
  /**
   * The words' language (build 90 note 4): the app's English, unless the verse was kept from a
   * downloaded Bible, whose language is not recorded with it (null: it runs as it is written).
   */
  textLang?: string | null;
  /** Which of the three steps (1.9): missing words, first letters, from memory. The first, unless said. */
  step?: RememberStep;
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
  /** Said from memory, the line that names no saved verse (a quote, the reader's own words, a verse taken by its place). */
  plainLine?: boolean;
  /** Opens the sheet that chooses what to learn; with none, there is no Change on the card (the Plus page's preview). */
  onChange?: () => void;
}) {
  const { t } = useTranslate();
  const words = useMemo(() => (text ? stepWords(text, step) : []), [text, step]);
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
    // The first button of the face that is shown: the other keeps its room, inert.
    else rowRef.current?.querySelector<HTMLButtonElement>("button:not([inert] *)")?.focus();
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
        {/* The head stands in the verse's light: on the four dark looks where
            it read under 4.5:1 there, its ink rises (.remember-head, app/globals.css). */}
        <p id={titleId} className="remember-head font-sans text-[12.5px] font-semibold text-paper/60">
          {title ?? t("remember.title")}
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
              <Link
                href={href}
                className="tap-press hit-44 mt-2 inline-block font-heading text-[24px] font-bold leading-tight text-paper"
                {...(referenceLang ? { lang: referenceLang, dir: textDir(referenceLang) } : {})}
              >
                {reference}
              </Link>
            ) : (
              <p className="mt-2 font-heading text-[24px] font-bold leading-tight text-paper">{reference}</p>
            )}

            {text ? (
              <>
                <p className="mt-2.5 font-serif text-[18px] leading-[1.62] text-paper/90" {...(textLang ? { lang: textLang, dir: textDir(textLang) } : { dir: "auto" })}>
                  <BlankedVerse words={words} shown={shown} blank={t("remember.blank")} firsts={step === 2} />
                </p>
                <p className="mt-2 font-sans text-caption text-paper/50">
                  {t(step === 3 ? (plainLine ? "remember.lineMemory" : "remember.line") : step === 2 ? "remember.lineFirst" : "remember.lineBlanks")}
                </p>
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
                ) : (
                  <>
                    {/* Show the words, and the two it turns into, Hide and Not yet,
                        share one place, as wide as the wider of the two: the row is
                        not centred again at the tap, so nothing moves under the
                        finger and I know it stays where it stood (1.9, the gate's tap
                        walk: Show the words moved 10px and Not yet came under the
                        finger). The face not shown keeps its room, unseen and inert. */}
                    <span data-remember-turn="" className="grid">
                      <span inert={shown} className={cn("col-start-1 row-start-1 flex", shown && "invisible")}>
                        <button type="button" disabled={!text} onClick={() => show(true)} className={cn(PILL, QUIET, "w-full justify-center")}>
                          {t("remember.show")}
                        </button>
                      </span>
                      <span inert={!shown} className={cn("col-start-1 row-start-1 flex gap-2", !shown && "invisible")}>
                        <button type="button" onClick={() => show(false)} className={cn(PILL, QUIET, "flex-auto justify-center")}>
                          {t("remember.hide")}
                        </button>
                        <button type="button" onClick={() => reply(false)} className={cn(PILL, QUIET, "flex-auto justify-center")}>
                          {t("remember.notYet")}
                        </button>
                      </span>
                    </span>
                    <button type="button" disabled={!text} onClick={() => reply(true)} className={cn(PILL, SOLID)}>
                      {t("remember.knew")}
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </>
        )}
        {/* What is learned can be changed at any time (build 93 note 11). */}
        {onChange ? (
          <p className="mt-2">
            <button type="button" data-learn-change="" onClick={onChange} className="tap-press hit-44 inline-flex items-center font-sans text-caption font-semibold text-paper/60">
              {t("learn.change")}
            </button>
          </p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The verse with its blanks: each blanked word unseen over its line, lit
 * white once shown. With `firsts` (1.9, the second step), each blank keeps
 * its first letter in sight.
 */
function BlankedVerse({ words, shown, blank, firsts = false }: { words: BlankedWord[]; shown: boolean; blank: string; firsts?: boolean }) {
  return words.map((w, i) => (
    <Fragment key={i}>
      {i ? " " : null}
      {w.blank ? (
        <span className="whitespace-nowrap">
          {w.lead}
          {firsts && !shown ? (
            <span className={BLANK}>
              {w.first}
              <span aria-hidden className="select-none text-transparent">
                {w.word.slice(w.first.length)}
              </span>
              <span className="sr-only">{blank}</span>
            </span>
          ) : (
            <span className={cn(BLANK, shown ? "remember-lit text-paper" : "select-none text-transparent")}>
              <span aria-hidden={shown ? undefined : true}>{w.word}</span>
              {shown ? null : <span className="sr-only">{blank}</span>}
            </span>
          )}
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
