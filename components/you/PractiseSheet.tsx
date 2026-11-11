"use client";

// Learn a kept verse by heart, from the You tab (1.8): Remember the verse
// (components/today/RememberCard.tsx) for the verse the reader chose, in the
// app's movable sheet. Today's card brings back the verse that is due; this
// lets a reader take up any verse they kept, when they want to.
//
// The same exercise and the same schedule: the verse is set out as its
// words' first letters, each on a tile, the reader checks a word at a time
// or the whole verse, then says how it went, and lib/remember/schedule.ts
// says when it comes back. An answer here is the day's answer, so Today's
// card rests until tomorrow, as it does after one answer there.
//
// A Plus feature, shown with its mark and never hidden (the owner's rule):
// without Plus the tiles are there, and "Show the words" opens the upgrade
// sheet named for Remember the verse.
//
// Since build 93 note 11 it takes whatever the reader is learning
// (lib/remember/items.ts): a verse, a quote from a text the app carries,
// under whose words they are and with the line that opens its place, or
// their own words, named as theirs. And "Change" leads to the sheet that
// chooses (components/learn/ChooseSheet.tsx), at any time.

import { Fragment, useMemo, useState, type ReactNode } from "react";

import { PlusLock, PlusMark } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import type { QuotePlace } from "@/lib/remember/items";
import { INTERVALS, addDays, answer, dayOf, hintWords, type Entry, type HintWord } from "@/lib/remember/schedule";

const PILL = "tap-press inline-flex h-11 items-center gap-1.5 rounded-pill px-4 font-sans text-caption font-semibold disabled:opacity-50";
const SOLID = "bg-paper text-night";
const QUIET = "border border-paper/20 text-paper/85";

// A word's first letter on a tile of its own, as on Today's card.
const TILE =
  "mx-px inline-flex h-[1.6em] min-w-[1.6em] items-center justify-center rounded-[0.4em] bg-paper/[0.07] px-[0.35em] font-medium text-paper ring-1 ring-inset ring-paper/[0.12]";
const WORD_IN =
  "inline-block motion-safe:transition-[opacity,filter] motion-safe:duration-[var(--duration-base)] motion-safe:ease-[var(--ease-house)] motion-safe:starting:opacity-0 motion-safe:starting:blur-[3px]";
const STAGGER_MS = 18;
const STAGGER_MAX_MS = 360;

/**
 * What is practised: its key in the schedule, the name it goes by (a verse's
 * reference, whose words a quote is, "Your own words"), and its words. A
 * quote brings the place it stands at.
 */
export type PractiseText = { key: string; kind: "verse" | "quote" | "own"; name: string; text: string; cite?: QuotePlace };

export function PractiseSheet({
  open,
  onClose,
  verse,
  onChange,
  waiting,
  desktop,
}: {
  open: boolean;
  onClose: () => void;
  verse: PractiseText | null;
  /** Opens the sheet that chooses what to learn; with none, there is no Change here. */
  onChange?: () => void;
  /** Said in the sheet while there are no words to practise (a verse's words still coming, or no signal the first time). */
  waiting?: string | null;
  /** On a computer too (Today's card is on the website's desktop Today). */
  desktop?: boolean;
}) {
  const { t } = useTranslate();
  const locked = usePlusFeatures() === false;
  // "Remember the verse" is a verse's name; a quote and the reader's own words are learned by heart.
  const title = !verse || verse.kind === "verse" ? t("remember.title") : t("you.verse.learn");
  return (
    <Sheet open={open} onClose={onClose} title={title} titleExtra={locked ? <PlusMark /> : undefined} openFull desktop={desktop}>
      {/* Keyed by what is practised, so a new one starts with its tiles closed. */}
      {verse ? (
        <Practise key={verse.key} verse={verse} locked={locked} onClose={onClose} onChange={onChange} />
      ) : waiting ? (
        <div className="pb-2">
          <p role="status" className="font-sans text-detail leading-snug text-paper/65">
            {waiting}
          </p>
          {onChange ? (
            <button type="button" data-learn-change="" onClick={onChange} className={cn(PILL, QUIET, "mt-4")}>
              {t("learn.change")}
            </button>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}

function Practise({ verse, locked, onClose, onChange }: { verse: PractiseText; locked: boolean; onClose: () => void; onChange?: () => void }) {
  const { t } = useTranslate();
  const upgrade = useUpgradeModal();
  const [today] = useState(() => dayOf(new Date()));
  const [step, setStep] = useState({ n: 0, from: 0 });
  const [answered, setAnswered] = useState<{ entry: Entry; knew: boolean } | null>(null);
  const words = useMemo(() => hintWords(verse.text), [verse.text]);
  const said = useMemo(() => words.filter((w) => w.word).map((w) => w.lead + w.word + w.tail), [words]);
  const done = said.length > 0 && step.n >= said.length;

  const showTo = (n: number) => setStep({ n: Math.min(n, said.length), from: step.n });
  const reply = (knew: boolean) => setAnswered({ entry: answer(verse.key, knew, today), knew });

  const back = answered
    ? answered.entry.box > INTERVALS.length
      ? t("remember.known")
      : answered.entry.due === addDays(today, 1)
        ? t("remember.backTomorrow")
        : t("remember.backIn", { count: Math.round((Date.parse(answered.entry.due) - Date.parse(today)) / 86_400_000) })
    : null;

  return (
    <div className="pb-2">
      <p className="font-sans text-detail leading-snug text-paper/65">{t(verse.kind === "verse" ? "remember.line" : "remember.lineMemory")}</p>
      <div className="mt-2 flex min-h-11 items-center justify-between gap-3">
        <p data-practise-name="" className="min-w-0 font-sans text-detail font-semibold text-paper/80" {...(verse.kind === "quote" ? { lang: "en", dir: "ltr" } : {})}>
          {verse.name}
        </p>
        {onChange ? (
          <button type="button" data-learn-change="" onClick={onChange} className="tap-press -me-2 inline-flex h-11 shrink-0 items-center rounded-pill px-3 font-sans text-caption font-semibold text-paper/70">
            {t("learn.change")}
          </button>
        ) : null}
      </div>
      {/* Tall lines while tiles stand in them; the verse's own once it is all shown. */}
      <p className={cn("mt-1 font-serif text-body text-paper/90", done || answered ? "leading-[1.6]" : "leading-[2.05]")} dir="auto">
        <VerseTiles words={words} n={answered ? said.length : step.n} from={step.from} />
      </p>
      {/* A quote's place, as every quotation wears it: the line opens the words where they stand. */}
      {verse.cite ? <SourceLine cite={{ kind: "father", ...verse.cite }} className="mt-2" /> : null}
      {/* What a tap shows, said for a screen reader. */}
      <p aria-live="polite" className="sr-only">
        {step.n > step.from ? said.slice(step.from, step.n).join(" ") : ""}
      </p>

      {back ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="flex items-center gap-2 font-sans text-ui text-paper/75">
            {answered?.knew ? <Check size={16} className="check-draw shrink-0" /> : null}
            {back}
          </p>
          <button type="button" onClick={onClose} className={cn(PILL, SOLID)}>
            {t("common.done")}
          </button>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {locked ? (
            <button type="button" onClick={() => upgrade.open("remember")} className={cn(PILL, SOLID)}>
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
              <button type="button" onClick={() => showTo(step.n + 1)} className={cn(PILL, QUIET)}>
                {t("remember.nextWord")}
              </button>
              <button type="button" onClick={() => showTo(said.length)} className={cn(PILL, SOLID)}>
                {t("remember.show")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** The verse as its words: the first `n` shown, the rest as first-letter tiles. */
function VerseTiles({ words, n, from }: { words: HintWord[]; n: number; from: number }) {
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
