"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { StrongsDefinition } from "@/components/bible/StrongsDefinition";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type Item = {
  ref: string;
  book: string;
  chapter: number;
  verse: number;
  greek: string;
  forms: string[];
  english: string | null;
  href: string;
};
type Answer = {
  lemma: string | null;
  translit: string | null;
  gloss: string | null;
  counts: { nt: number; ot: number };
  next: number | null;
  items: Item[];
};

const GREEK = { fontFamily: "var(--font-greek), serif" } as const;

/**
 * The studies already asked for, by address, kept for the visit: the Bible
 * does not change (the server keeps an answer a day). A study asked for
 * again, or loaded ahead (the Plus page's preview loads its three words as
 * it opens, the owner's note 43 of build 80), is drawn whole at once rather
 * than from "Finding every place". A failure is not kept: it is asked again.
 */
const asked = new Map<string, Promise<Answer>>();
const answered = new Map<string, Answer>();
/** Enough for a visit's studies; the oldest go first. */
const KEEP = 24;

/** A study's first verses in one testament: what a study opens on. */
function addressOf(strongs: string, tab: "ot" | "nt"): string {
  return `/api/bible/word?s=${encodeURIComponent(strongs)}&t=${tab}&offset=0`;
}

function askFor(strongs: string, tab: "ot" | "nt"): Promise<Answer> {
  const at = addressOf(strongs, tab);
  const known = asked.get(at);
  if (known) return known;
  const p = apiFetch(at)
    .then((r) => (r.ok ? (r.json() as Promise<Answer>) : Promise.reject(new Error(String(r.status)))))
    .then((a) => {
      answered.set(at, a);
      return a;
    })
    .catch((e: unknown) => {
      asked.delete(at);
      throw e;
    });
  asked.set(at, p);
  while (asked.size > KEEP) {
    const oldest = asked.keys().next().value;
    if (oldest === undefined) break;
    asked.delete(oldest);
    answered.delete(oldest);
  }
  return p;
}

/** Load a word's study ahead, its first verses in one testament. True once here, false if it failed. */
export function preloadWordStudy(strongs: string, tab: "ot" | "nt"): Promise<boolean> {
  return askFor(strongs, tab).then(
    () => true,
    () => false,
  );
}

type Tab = "ot" | "nt";
/** One testament's verses in a study: those come so far, and whether more are coming. */
type Shelf = { answer: Answer | null; items: Item[]; loading: boolean; failed: boolean };

/** A testament's shelf as a study opens: whole at once if it is already here. */
function shelfFor(strongs: string | null, tab: Tab): Shelf {
  const answer = strongs ? (answered.get(addressOf(strongs, tab)) ?? null) : null;
  return { answer, items: answer?.items ?? [], loading: answer === null, failed: false };
}

/** The verse's Greek with the word's own forms marked. */
function Marked({ text, forms }: { text: string; forms: string[] }) {
  if (forms.length === 0) return <>{text}</>;
  const escaped = forms.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "g"));
  return (
    <>
      {parts.map((p, i) =>
        forms.includes(p) ? (
          <mark key={i} className="rounded-sm bg-premium/20 px-0.5 text-premium-bright">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/**
 * The Greek word study (a Purify Plus tool): every verse a word stands in,
 * in the Septuagint and in the New Testament (app/api/bible/word). Opened
 * from a Greek word's card in the interlinear. Each verse shows its Greek
 * with the word marked and, where the Greek pairs with Purify's English verse
 * for verse, the English too; where it does not, the Greek alone and a link
 * to the chapter rather than to a verse that would be the wrong one.
 */
export function WordStudySheet({
  strongs,
  lemma,
  startIn,
  onClose,
}: {
  /** The Strong's number open, or null when closed. */
  strongs: string | null;
  lemma?: string | null;
  /** Which testament to open on: the one the reader is in. */
  startIn: "ot" | "nt";
  onClose: () => void;
}) {
  const { t } = useTranslate();
  return (
    <Sheet open={strongs !== null} onClose={onClose} title={t("bible.wordStudyTitle")} desktop bodyClassName="px-5 pb-6 pt-1">
      <WordStudyBody strongs={strongs} lemma={lemma} startIn={startIn} onLeave={onClose} />
    </Sheet>
  );
}

/**
 * The study itself, the sheet's body: the word, its dictionary entry, the
 * two testaments with how often it stands in each, and its verses. Also what
 * the Plus page's preview of the word study shows (components/billing/
 * plusTry/TryWordStudy.tsx), so the preview is the study, not a picture of it.
 */
export function WordStudyBody({
  strongs,
  lemma,
  startIn,
  onLeave,
}: {
  /** The Strong's number to study; null keeps what is shown (a sheet closing). */
  strongs: string | null;
  lemma?: string | null;
  /** Which testament to open on. */
  startIn: "ot" | "nt";
  /** Called as a verse's link is followed (the sheet closes). */
  onLeave?: () => void;
}) {
  const { t, tn } = useTranslate();
  const id = useId();
  // Mounted afresh for each word (the caller keys it), so it opens in the
  // testament being read with nothing left over from the last word. A study
  // already here opens whole.
  const [tab, setTab] = useState<Tab>(startIn);
  // Each testament keeps its own verses, both asked for as the study opens,
  // the open one first: the other is here when its tab is tapped, and the two
  // lists share one cell below, so the sheet is as tall as the taller and its
  // edge, title and tabs stand still when the testament changes (build 97
  // note 9's rule; the old study emptied its list, fell, then rose again).
  const [shelves, setShelves] = useState<Record<Tab, Shelf>>(() => ({ ot: shelfFor(strongs, "ot"), nt: shelfFor(strongs, "nt") }));
  const [asks, setAsks] = useState(0);

  useEffect(() => {
    if (!strongs) return;
    let alive = true;
    for (const key of [startIn, startIn === "ot" ? "nt" : "ot"] as const) {
      askFor(strongs, key).then(
        (a) => {
          if (alive) setShelves((s) => (s[key].answer ? s : { ...s, [key]: { answer: a, items: a.items, loading: false, failed: false } }));
        },
        () => {
          if (alive) setShelves((s) => (s[key].answer ? s : { ...s, [key]: { ...s[key], loading: false, failed: true } }));
        },
      );
    }
    return () => {
      alive = false;
    };
  }, [strongs, startIn, asks]);

  const choose = (key: Tab) => {
    if (key === tab) return;
    setTab(key);
    // A testament that could not be fetched is asked for again as it is chosen.
    if (shelves[key].failed && !shelves[key].answer) {
      setShelves((s) => ({ ...s, [key]: { ...s[key], loading: true, failed: false } }));
      setAsks((n) => n + 1);
    }
  };

  const more = () => {
    const key = tab;
    const next = shelves[key].answer?.next;
    if (!strongs || next == null) return;
    setShelves((s) => ({ ...s, [key]: { ...s[key], loading: true } }));
    apiFetch(`/api/bible/word?s=${encodeURIComponent(strongs)}&t=${key}&offset=${next}`)
      .then((r) => (r.ok ? (r.json() as Promise<Answer>) : Promise.reject(new Error(String(r.status)))))
      .then((a) => setShelves((s) => ({ ...s, [key]: { answer: a, items: [...s[key].items, ...a.items], loading: false, failed: false } })))
      .catch(() => setShelves((s) => ({ ...s, [key]: { ...s[key], loading: false, failed: true } })));
  };

  // The word, its entry and its counts are the same in either testament's answer.
  const answer = shelves[tab].answer ?? shelves[tab === "ot" ? "nt" : "ot"].answer;

  const title = answer?.lemma ?? lemma ?? "";
  return (
    <>
      <p lang="grc" dir="ltr" style={GREEK} className="text-title text-paper">
        {title}
      </p>
      {/* The transliteration and Strong's definition are English (build 90 note 4). */}
      {answer?.translit ? (
        <p lang="en" dir="ltr" className="mt-1 font-sans text-ui text-paper/60">
          {answer.translit}
        </p>
      ) : null}
      {answer?.gloss ? (
        <p lang="en" dir="ltr" className="mt-2 font-sans text-ui leading-[1.55] text-paper/80">
          <StrongsDefinition text={answer.gloss} />
        </p>
      ) : null}

      {/* Two equal pills, the name over the count, so neither wraps mid-phrase
          on a phone. */}
      <div role="tablist" aria-label={t("bible.wordStudyTitle")} className="mt-4 grid grid-cols-2 gap-2">
        {(["ot", "nt"] as const).map((key) => (
          <button
            key={key}
            type="button"
            id={`${id}-tab-${key}`}
            aria-controls={`${id}-${key}`}
            role="tab"
            aria-selected={tab === key}
            onClick={() => choose(key)}
            className={cn(
              "flex min-h-11 min-w-0 flex-col items-center justify-center rounded-pill border px-4 py-1.5 text-center font-sans text-detail font-semibold leading-tight transition-colors",
              tab === key ? "border-premium/50 bg-premium/[0.10] text-premium-ink" : "border-paper/15 text-paper/70 hover:border-paper/35",
            )}
          >
            {t(key === "ot" ? "bible.wordStudyOT" : "bible.wordStudyNT")}
            {/* The count: smaller and lighter than the name, never fainter (at 80% it fell to 3.5:1 on Light, build 89 note 12's check). */}
            {answer ? (
              <span className="whitespace-nowrap text-caption font-normal tabular-nums">
                {tn("bible.wordStudyTimes", answer.counts[key])}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* The two testaments in one cell, the one not shown unseen and out of
          reach, so the panel keeps the taller one's height. */}
      <div className="grid">
        {(["ot", "nt"] as const).map((key) => {
          const on = key === tab;
          const s = shelves[key];
          return (
            <div
              key={key}
              id={`${id}-${key}`}
              role="tabpanel"
              aria-labelledby={`${id}-tab-${key}`}
              className={cn("col-start-1 row-start-1 min-w-0", on ? undefined : "invisible")}
              aria-hidden={on ? undefined : true}
              inert={!on}
            >
                    <ol className="mt-4 divide-y divide-paper/10">
                      {s.items.map((it) => (
                        <li key={it.ref}>
                          <Link href={it.href} onClick={onLeave} className="group block py-3.5">
                            <p className="font-sans text-detail font-semibold text-premium-ink group-hover:text-premium-bright">
                              {t(`bible.books.${it.book}`)} {it.chapter}:{it.verse}
                            </p>
                            {it.english ? (
                              <p lang="en" dir="ltr" className="mt-1 font-serif text-body leading-[1.6] text-paper/85">
                                {it.english}
                              </p>
                            ) : null}
                            <p lang="grc" dir="ltr" style={GREEK} className="mt-1 text-ui leading-[1.6] text-paper/65">
                              <Marked text={it.greek} forms={it.forms} />
                            </p>
                            {it.english === null ? (
                              <p className="mt-1 font-sans text-caption text-paper/45">{t("bible.wordStudyGreekNumbering")}</p>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ol>
                    {s.loading ? <p className="mt-4 font-sans text-detail text-paper/55">{t("bible.wordStudyLoading")}</p> : null}
                    {s.failed ? <p className="mt-4 font-sans text-detail text-crimson-soft">{t("bible.wordStudyFailed")}</p> : null}
                    {!s.loading && s.answer && s.items.length === 0 && !s.failed ? (
                      <p className="mt-4 font-sans text-detail text-paper/55">{t("bible.wordStudyNone")}</p>
                    ) : null}
                    {s.answer?.next != null && !s.loading ? (
                      <button
                        type="button"
                        onClick={more}
                        className="mt-4 inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-5 font-sans text-detail font-semibold text-paper hover:border-paper/45"
                      >
                        {t("bible.wordStudyMore")}
                      </button>
                    ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-5 font-sans text-caption text-paper/45">{t("bible.wordStudyCredit")}</p>
    </>
  );
}
