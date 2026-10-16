"use client";

// The end of a chapter (the owner's specification, 3.2): "reflective,
// zero-failure structural checks" in place of a quiz, and then the finish.
//
//   Put it in order   tap the chapter's moments in the order they happen.
//   Who said it?      match a line to its speaker.
//   Your ledger       one sentence of your own, kept, which closes the chapter.
//
// Nothing here can be failed. A wrong tap never scores or scolds: it shows the
// verse itself, with the words in question set in full strength, so the text
// answers ("incorrect inputs provide direct text highlights rather than
// penalty prompts"). Each step opens when the one before it is done.
//
// 1.7, the owner's note 24 of 2026-10-16: no tinted boxes, no stripes, no gold,
// no ticks set as characters and nothing that pops. The steps are plain rows
// and pills, a step done carries the drawn check, and the finish is quiet and
// real: the chapter walked, the reader's own sentence, the days in a row, a
// soft tick in the hand in the apps, and the way on.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Lampada } from "@/components/ui/icons/Lampada";
import { cn } from "@/lib/cn";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { softTick } from "@/lib/ui/softTick";
import type { Attribution, Beat, ChapterWalk, Speaker } from "@/lib/walkthroughs/types";

/** Stable per chapter, so the list does not reshuffle on every render. */
function shuffled<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Never hand over the answer: if the shuffle kept the order, rotate it.
  if (out.every((x, i) => x === items[i])) out.push(out.shift()!);
  return out;
}

const QUOTE_OPEN = "“";
const QUOTE_CLOSE = "”";

const STEP_TITLE = "flex items-center gap-2 text-lede font-semibold leading-snug text-paper";
const STEP_HINT = "mt-1 font-sans text-detail leading-[1.5] text-paper/60";
const CHOICE =
  "tap-press flex min-h-12 w-full items-center rounded-2xl px-4 py-3 text-start font-sans text-ui leading-snug text-paper/85 ring-1 ring-inset ring-paper/15 hover:text-paper hover:ring-paper/30";

/** A step's heading, with the drawn check once it is done. */
function StepTitle({ id, done, children }: { id: string; done: boolean; children: React.ReactNode }) {
  const { t } = useTranslate();
  return (
    <h3 id={id} className={STEP_TITLE}>
      {children}
      {done ? (
        <>
          <Check size={18} className="shrink-0 text-paper/70" />
          <span className="sr-only">{t("common.done")}</span>
        </>
      ) : null}
    </h3>
  );
}

/** The verse itself, the words in question in full strength and the rest quieter. */
function VerseEcho({ verse, text, mark }: { verse: number; text: string; mark?: string }) {
  const { t } = useTranslate();
  const at = mark ? text.indexOf(mark) : -1;
  return (
    <figure className="mt-3">
      <figcaption className="font-sans text-caption font-semibold text-paper/55">{t("walk.verseShort", { verse })}</figcaption>
      <blockquote lang="en" className="mt-1 font-serif text-body leading-[1.6] text-paper/65">
        {at >= 0 && mark ? (
          <>
            {text.slice(0, at)}
            <mark className="bg-transparent font-semibold text-paper">{mark}</mark>
            {text.slice(at + mark.length)}
          </>
        ) : (
          text
        )}
      </blockquote>
    </figure>
  );
}

function Order({ beats, seed, verses, onDone }: { beats: Beat[]; seed: number; verses: Map<number, string>; onDone: () => void }) {
  const { t } = useTranslate();
  const pool = useMemo(() => shuffled(beats, seed), [beats, seed]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [hint, setHint] = useState<Beat | null>(null);
  const done = placed.length === beats.length;

  const tap = (b: Beat) => {
    const expected = beats[placed.length];
    if (b.id === expected.id) {
      const next = [...placed, b.id];
      setPlaced(next);
      setHint(null);
      if (next.length === beats.length) onDone();
    } else {
      setHint(expected);
    }
  };

  return (
    <section aria-labelledby="walk-order" data-walk-step="order">
      <StepTitle id="walk-order" done={done}>
        {t("walk.orderTitle")}
      </StepTitle>
      <p className={STEP_HINT}>{t("walk.orderHint")}</p>

      {placed.length > 0 ? (
        <ol className="mt-3 divide-y divide-paper/[0.07] border-y border-paper/[0.08]">
          {placed.map((id, i) => {
            const b = beats.find((x) => x.id === id)!;
            return (
              <li key={id} data-walk-placed className="flex gap-3 py-3">
                <span className="w-5 shrink-0 text-end font-sans text-caption font-semibold tabular-nums text-paper/55">{i + 1}</span>
                <span lang="en" className="min-w-0 font-sans text-ui leading-snug text-paper/90">
                  {b.text}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {!done ? (
        <div className="mt-3 space-y-2">
          {pool
            .filter((b) => !placed.includes(b.id))
            .map((b) => (
              <button key={b.id} type="button" data-walk-choice onClick={() => tap(b)} className={CHOICE}>
                <span lang="en">{b.text}</span>
              </button>
            ))}
        </div>
      ) : null}

      <div aria-live="polite">
        {hint && !done ? (
          <>
            <p className="mt-4 font-sans text-detail text-paper/70">{t("walk.orderLook")}</p>
            <VerseEcho verse={hint.verse} text={verses.get(hint.verse) ?? ""} />
          </>
        ) : null}
      </div>
    </section>
  );
}

function Who({ items, verses, onDone }: { items: Attribution[]; verses: Map<number, string>; onDone: () => void }) {
  const { t } = useTranslate();
  const [right, setRight] = useState<Record<string, true>>({});
  const [tried, setTried] = useState<Record<string, Speaker[]>>({});
  const done = items.every((a) => right[a.id]);

  const pick = (a: Attribution, s: Speaker) => {
    if (right[a.id]) return;
    if (s === a.speaker) {
      const next = { ...right, [a.id]: true as const };
      setRight(next);
      if (items.every((x) => next[x.id])) onDone();
    } else {
      setTried({ ...tried, [a.id]: [...(tried[a.id] ?? []), s] });
    }
  };

  return (
    <section aria-labelledby="walk-who" data-walk-step="who">
      <StepTitle id="walk-who" done={done}>
        {t("walk.whoTitle")}
      </StepTitle>
      <p className={STEP_HINT}>{t("walk.whoHint")}</p>
      <ul className="mt-3 divide-y divide-paper/[0.07] border-y border-paper/[0.08]">
        {items.map((a) => {
          const missed = tried[a.id] ?? [];
          return (
            <li key={a.id} className="py-4">
              <p lang="en" className="font-serif text-body italic leading-[1.55] text-paper">
                {QUOTE_OPEN}
                {a.quote}
                {QUOTE_CLOSE}
              </p>
              <div role="group" aria-label={a.quote} className="mt-3 flex flex-wrap gap-2">
                {a.choices.map((s) => {
                  const isRight = Boolean(right[a.id]) && s === a.speaker;
                  const wasWrong = missed.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => pick(a, s)}
                      disabled={Boolean(right[a.id]) || wasWrong}
                      aria-pressed={isRight}
                      className={cn(
                        "tap-press inline-flex min-h-11 items-center gap-1.5 rounded-pill px-4 font-sans text-detail font-semibold",
                        isRight
                          ? "bg-paper text-night"
                          : wasWrong
                            ? "text-paper/35 ring-1 ring-inset ring-paper/10"
                            : "text-paper/80 ring-1 ring-inset ring-paper/20 hover:text-paper hover:ring-paper/40 disabled:text-paper/40",
                      )}
                    >
                      {t(`walk.speaker.${s}`)}
                      {isRight ? <Check size={15} className="shrink-0" /> : null}
                    </button>
                  );
                })}
              </div>
              <div aria-live="polite">
                {missed.length > 0 && !right[a.id] ? (
                  <VerseEcho verse={a.verse} text={verses.get(a.verse) ?? ""} mark={a.quote} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Synthesis({
  book,
  chapter,
  walk,
  verses,
  finishedAt,
  savedText,
  streak,
  nextChapter,
  walkedAll,
  onComplete,
}: {
  book: string;
  chapter: number;
  walk: ChapterWalk;
  verses: Map<number, string>;
  /** When the chapter was finished, if it has been. */
  finishedAt: number | null;
  savedText: string;
  streak: number;
  /** The chapter after this one, if the walk has it. */
  nextChapter: number | null;
  /** Every chapter of the book is walked. */
  walkedAll: boolean;
  onComplete: (text: string) => void;
}) {
  const { t, tn, locale } = useTranslate();
  const [ordered, setOrdered] = useState(false);
  const [attributed, setAttributed] = useState(false);
  const [text, setText] = useState("");
  const [again, setAgain] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const finished = finishedAt != null && !again;

  // The moment of finishing: the chapter walked is where the reader's eyes
  // and a screen reader's focus land, at once and without a slide.
  useEffect(() => {
    if (!justFinished || !finished) return;
    heading.current?.scrollIntoView({ block: "center" });
    heading.current?.focus({ preventScroll: true });
  }, [justFinished, finished]);

  const finish = (withText: string) => {
    onComplete(withText);
    softTick();
    setJustFinished(true);
    setAgain(false);
  };

  if (finished) {
    const on = new Date(finishedAt!).toLocaleDateString(dateLocale(locale), { month: "long", day: "numeric" });
    return (
      <section aria-labelledby="walk-finished" data-walk-finished className="mt-16">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-paper text-night">
            <Check size={18} strokeWidth={2.4} />
          </span>
          <h2
            id="walk-finished"
            ref={heading}
            tabIndex={-1}
            className="text-title-sm font-bold leading-tight text-paper outline-none"
          >
            {justFinished ? t("walk.chapterWalked", { n: chapter }) : t("walk.walkedOn", { date: on })}
          </h2>
        </div>
        {savedText ? <p className="mt-4 font-serif text-body italic leading-[1.6] text-paper/85">{savedText}</p> : null}
        {walkedAll ? <p className="mt-4 font-serif text-body leading-[1.6] text-paper">{t("walk.walkedInFull")}</p> : null}
        {streak > 0 ? (
          <p className="mt-3 inline-flex items-center gap-1.5 font-sans text-detail text-paper/65">
            <Lampada size={15} className="shrink-0" />
            {tn("walk.streakDays", streak)}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {nextChapter ? (
            <Link
              href={`/walkthroughs/${book}/${nextChapter}`}
              className="tap-press inline-flex min-h-11 items-center gap-1.5 rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night"
            >
              {t("walk.nextChapter", { n: nextChapter })}
              <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
            </Link>
          ) : null}
          <Link
            href={`/walkthroughs/${book}`}
            className="tap-press inline-flex min-h-11 items-center rounded-pill px-5 font-sans text-ui font-semibold text-paper/80 ring-1 ring-inset ring-paper/20 hover:text-paper"
          >
            {t("walk.wholeWalk")}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            setAgain(true);
            setJustFinished(false);
            setOrdered(false);
            setAttributed(false);
            setText("");
          }}
          className="tap-press -ms-1 mt-2 inline-flex min-h-11 items-center px-1 font-sans text-detail text-paper/55 hover:text-paper"
        >
          {t("walk.again")}
        </button>
      </section>
    );
  }

  const ready = ordered && attributed;
  return (
    <section aria-labelledby="walk-gather" data-walk-gather className="mt-16">
      <h2 id="walk-gather" className="text-title-sm font-bold leading-tight text-paper">
        {t("walk.synthesisTitle")}
      </h2>
      <div className="mt-6 space-y-10">
        <Order beats={walk.beats} seed={chapter} verses={verses} onDone={() => setOrdered(true)} />
        {ordered ? <Who items={walk.attribution} verses={verses} onDone={() => setAttributed(true)} /> : null}
        {ready ? (
          <section aria-labelledby="walk-ledger" data-walk-step="ledger">
            <StepTitle id="walk-ledger" done={false}>
              {t("walk.ledgerTitle")}
            </StepTitle>
            <p lang="en" className="mt-1 font-serif text-body italic leading-[1.5] text-paper/85">
              {walk.prompt}
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={600}
              rows={4}
              aria-label={t("walk.ledgerTitle")}
              placeholder={t("walk.ledgerPlaceholder")}
              className="mt-3 w-full resize-y rounded-2xl border border-paper/15 bg-transparent px-4 py-3 font-serif text-body leading-[1.55] text-paper placeholder:text-paper/50 focus:border-paper/40 focus:outline-none"
            />
            <p className="mt-1 font-sans text-caption text-paper/50">{t("walk.ledgerPrivate")}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => finish(text)}
                disabled={text.trim().length < 3}
                className="tap-press inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night disabled:opacity-40"
              >
                {t("walk.finish")}
              </button>
              <button
                type="button"
                onClick={() => finish("")}
                className="tap-press inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-ui text-paper/60 hover:text-paper"
              >
                {t("walk.finishQuiet")}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
