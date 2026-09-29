"use client";

// End-of-chapter synthesis (the owner's specification, 3.2): "reflective,
// zero-failure structural checks" in place of a quiz.
//
//   Put it in order   tap the chapter's moments in the order they happen.
//   Who said it?      match a line to its speaker.
//   Your ledger       one sentence of your own, kept, which closes the chapter.
//
// Nothing here can be failed. A wrong tap never scores or scolds: it shows
// the verse itself, the relevant words marked, so the text answers ("incorrect
// inputs provide direct text highlights rather than penalty prompts").

import { useMemo, useState } from "react";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Lampada } from "@/components/ui/icons/Lampada";
import { cn } from "@/lib/cn";
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

const TICK = "✓";
const QUOTE_OPEN = "“";
const QUOTE_CLOSE = "”";

function VerseEcho({ verse, text, mark }: { verse: number; text: string; mark?: string }) {
  const { t } = useTranslate();
  const at = mark ? text.indexOf(mark) : -1;
  return (
    <p className="walk-echo mt-2 rounded-xl bg-premium/[0.08] px-3 py-2 font-serif text-detail leading-[1.55] text-paper/85 ring-1 ring-inset ring-premium/25">
      <span className="mr-1.5 font-sans text-caption font-semibold text-premium-ink">{t("walk.verseShort", { verse })}</span>
      {at >= 0 ? (
        <>
          {text.slice(0, at)}
          <mark className="rounded bg-premium/25 px-0.5 text-paper">{mark}</mark>
          {text.slice(at + mark!.length)}
        </>
      ) : (
        text
      )}
    </p>
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
    <section aria-labelledby="walk-order" className="walk-step">
      <h3 id="walk-order" className="font-heading text-ui font-bold text-paper">
        {t("walk.orderTitle")}
        {done ? <span className="walk-tick ml-2 text-premium-ink">{TICK}</span> : null}
      </h3>
      <p className="mt-1 font-sans text-caption text-paper/55">{t("walk.orderHint")}</p>

      {placed.length > 0 ? (
        <ol className="mt-3 space-y-1.5">
          {placed.map((id, i) => {
            const b = beats.find((x) => x.id === id)!;
            return (
              <li key={id} className="walk-placed flex gap-3 rounded-xl bg-premium/[0.08] px-3 py-2.5 ring-1 ring-inset ring-premium/25">
                <span className="font-sans text-caption font-semibold text-premium-ink">{i + 1}</span>
                <span className="font-sans text-detail leading-[1.45] text-paper/90">{b.text}</span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {!done ? (
        <div className="mt-3 space-y-1.5">
          {pool
            .filter((b) => !placed.includes(b.id))
            .map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => tap(b)}
                className="walk-choice flex min-h-11 w-full items-center rounded-xl border border-paper/15 bg-paper/[0.03] px-3 py-2.5 text-left font-sans text-detail leading-[1.45] text-paper/85 transition-colors hover:border-paper/30"
              >
                {b.text}
              </button>
            ))}
        </div>
      ) : null}

      {hint && !done ? (
        <div aria-live="polite">
          <p className="mt-3 font-sans text-caption text-paper/60">{t("walk.orderLook")}</p>
          <VerseEcho verse={hint.verse} text={verses.get(hint.verse) ?? ""} />
        </div>
      ) : null}
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
    <section aria-labelledby="walk-who" className="walk-step">
      <h3 id="walk-who" className="font-heading text-ui font-bold text-paper">
        {t("walk.whoTitle")}
        {done ? <span className="walk-tick ml-2 text-premium-ink">{TICK}</span> : null}
      </h3>
      <p className="mt-1 font-sans text-caption text-paper/55">{t("walk.whoHint")}</p>
      <div className="mt-3 space-y-4">
        {items.map((a) => {
          const missed = tried[a.id] ?? [];
          return (
            <div key={a.id} className="rounded-2xl bg-paper/[0.03] p-3 ring-1 ring-inset ring-paper/10">
              <p className="font-serif text-ui italic leading-[1.5] text-paper">
                {QUOTE_OPEN}
                {a.quote}
                {QUOTE_CLOSE}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {a.choices.map((s) => {
                  const isRight = right[a.id] && s === a.speaker;
                  const wasWrong = missed.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => pick(a, s)}
                      disabled={!!right[a.id] || wasWrong}
                      aria-pressed={isRight}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-pill border px-4 font-sans text-caption transition-colors",
                        isRight
                          ? "border-premium/60 bg-premium/15 font-semibold text-premium-ink"
                          : wasWrong
                            ? "border-paper/10 text-paper/35"
                            : "border-paper/20 text-paper/80 hover:border-paper/40",
                      )}
                    >
                      {t(`walk.speaker.${s}`)}
                      {isRight ? <span className="walk-tick ml-1.5">{TICK}</span> : null}
                    </button>
                  );
                })}
              </div>
              {missed.length > 0 && !right[a.id] ? (
                <div aria-live="polite">
                  <VerseEcho verse={a.verse} text={verses.get(a.verse) ?? ""} mark={a.quote} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
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
  nextChapter: number | null;
  onComplete: (text: string) => void;
}) {
  const { t, tn, locale } = useTranslate();
  const [ordered, setOrdered] = useState(false);
  const [attributed, setAttributed] = useState(false);
  const [text, setText] = useState("");
  const [again, setAgain] = useState(false);
  const [justFinished, setJustFinished] = useState(false);

  const finished = finishedAt != null && !again;

  const finish = (withText: string) => {
    onComplete(withText);
    setJustFinished(true);
    setAgain(false);
  };

  if (finished) {
    const on = new Date(finishedAt!).toLocaleDateString(locale, { month: "long", day: "numeric" });
    return (
      <section className={cn("walk-done mt-12 rounded-[26px] p-5 ring-1 ring-inset ring-premium/30", justFinished && "is-new")}>
        <h3 className="text-title-sm font-bold leading-tight text-paper">
          {justFinished ? t("walk.chapterWalked", { n: chapter }) : t("walk.walkedOn", { date: on })}
        </h3>
        {savedText ? (
          <p className="mt-3 border-l-2 border-premium/50 pl-3 font-serif text-ui italic leading-[1.55] text-paper/85">{savedText}</p>
        ) : null}
        {streak > 0 ? (
          <p className="mt-4 inline-flex items-center gap-1.5 font-sans text-detail text-paper/70">
            <Lampada size={14} />
            {tn("walk.streakDays", streak)}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          {nextChapter ? (
            <Link
              href={`/walkthroughs/${book}/${nextChapter}`}
              className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-caption font-semibold text-night transition-colors hover:bg-paper/90"
            >
              {t("walk.nextChapter", { n: nextChapter })}
            </Link>
          ) : null}
          <Link
            href={`/walkthroughs/${book}`}
            className="inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-5 font-sans text-caption text-paper/80 transition-colors hover:border-paper/40"
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
          className="mt-2 inline-flex min-h-11 items-center font-sans text-caption text-paper/55 underline-offset-4 transition-colors hover:text-paper hover:underline"
        >
          {t("walk.again")}
        </button>
      </section>
    );
  }

  const ready = ordered && attributed;
  return (
    <section className="mt-12" aria-labelledby="walk-synthesis">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.4px] text-premium-ink">{t("walk.synthesisEyebrow")}</p>
      <h2 id="walk-synthesis" className="mt-1.5 text-title-sm font-bold leading-tight text-paper">
        {t("walk.synthesisTitle")}
      </h2>
      <div className="mt-6 space-y-8">
        <Order beats={walk.beats} seed={chapter} verses={verses} onDone={() => setOrdered(true)} />
        {ordered ? <Who items={walk.attribution} verses={verses} onDone={() => setAttributed(true)} /> : null}
        {ready ? (
          <section aria-labelledby="walk-ledger" className="walk-step">
            <h3 id="walk-ledger" className="font-heading text-ui font-bold text-paper">
              {t("walk.ledgerTitle")}
            </h3>
            <p className="mt-1 font-serif text-ui italic leading-[1.5] text-paper/85">{walk.prompt}</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={600}
              rows={4}
              aria-label={t("walk.ledgerTitle")}
              placeholder={t("walk.ledgerPlaceholder")}
              className="mt-3 w-full resize-y rounded-2xl border border-paper/15 bg-paper/[0.03] px-4 py-3 font-serif text-ui leading-[1.55] text-paper placeholder:text-paper/35 focus:border-paper/40 focus:outline-none"
            />
            <p className="mt-1 font-sans text-caption text-paper/45">{t("walk.ledgerPrivate")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => finish(text)}
                disabled={text.trim().length < 3}
                className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-caption font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-50"
              >
                {t("walk.finish")}
              </button>
              <button
                type="button"
                onClick={() => finish("")}
                className="inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-caption text-paper/55 transition-colors hover:text-paper"
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
