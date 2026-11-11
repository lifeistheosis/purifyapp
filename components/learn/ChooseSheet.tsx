"use client";

// What will you learn? (1.9, build 93 note 11; the owner's word of 2026-11-11:
// "Allow you to switch the learn the verse whenever you want. Also allow a
// learn the quote ... or maybe they want to pick a custom quote, allow them to
// do that, or a custom verse.")
//
// One sheet, three small choices that switch what it shows (pills are right
// for that: the arbiter's ruling of 2026-11-11):
//
//   A verse         the verses the reader kept, and a field for any
//                   reference, which shows the verse from the Bible the app
//                   carries before it is taken. Scripture is never typed here:
//                   a verse in the reader's own wording is "Your own words".
//   A quote         a Father's or a council's words, only as a text the app
//                   carries prints them and with the place they stand at
//                   (lib/remember/sources.ts): the app's own cited sayings,
//                   lines the reader gathered, and a pasted line that "Who
//                   said it" finds, learned in the book's words. A line it
//                   cannot find is offered as the reader's own words, never
//                   under a saint's name by us.
//   Your own words  a field. On a card they are marked "Added by you", which
//                   claims no author: a line that was not found is someone's
//                   words, not the reader's (the arbiter, 2026-11-11).
//
// Taking something up chooses it: it stands on You's card and is asked first
// on Today's until the reader changes it, which they may at any time. The
// schedule still brings each thing back when it is due.
//
// Choosing is open to every reader, with or without Plus; checking the words
// is the Plus feature it was (components/you/PractiseSheet.tsx). No line here
// says anything travels between devices: lib/sync/keptMerge.ts says what does.

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FilterChip } from "@/components/ui/FilterChip";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { Close } from "@/components/ui/icons/Close";
import { apiFetch } from "@/lib/api/client";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import { cn } from "@/lib/cn";
import { useFlorilegia } from "@/lib/florilegium/florilegium";
import { OWN_MAX, ownItem, quoteItem, verseItem, type LearnItem, type LearnQuote, type LearnVerse } from "@/lib/remember/items";
import { choose, dropItem, keepItem, verseKey } from "@/lib/remember/schedule";
import { carriedQuotes, foundQuote, gatheredQuotes, type FoundAnswer, type QuoteOffer } from "@/lib/remember/sources";
import { useLearning } from "@/lib/remember/useLearning";
import { useVerseWords } from "@/lib/saved/verseWords";
import { referencesIn } from "@/lib/search/references";

type Kind = LearnItem["kind"];

const FIELD =
  "w-full rounded-[14px] border border-paper/10 bg-paper/[0.04] px-4 font-serif text-body leading-[1.6] text-paper placeholder:text-paper/55 focus:border-paper/30 focus:bg-paper/[0.06] focus:outline-none";
const SOLID = "tap-press inline-flex h-11 items-center rounded-pill bg-paper px-5 font-sans text-caption font-semibold text-night disabled:opacity-50";
const QUIET = "tap-press inline-flex h-11 items-center rounded-pill border border-paper/20 px-5 font-sans text-caption font-semibold text-paper/85 disabled:opacity-50";
const HEAD = "font-sans text-caption font-semibold text-paper/55";
const NOTE = "font-sans text-detail leading-[1.5] text-paper/60";

const MIN_WORDS = 5;

export function ChooseSheet({
  open,
  onClose,
  onTake,
  desktop,
}: {
  open: boolean;
  onClose: () => void;
  /** The reader took this up: it is kept and chosen already. */
  onTake: (item: LearnItem) => void;
  /** On a computer too (Today's card is on the website's desktop Today). */
  desktop?: boolean;
}) {
  const { t } = useTranslate();
  const { chosen } = useLearning();
  const [picked, setPicked] = useState<Kind | null>(null);
  // It opens on the kind of what is being learned now.
  const kind = picked ?? chosen?.kind ?? "verse";
  const KINDS: { id: Kind; label: string }[] = [
    { id: "verse", label: t("learn.verse") },
    { id: "quote", label: t("learn.quote") },
    { id: "own", label: t("remember.own") },
  ];
  const close = () => {
    setPicked(null);
    onClose();
  };
  const take = (item: LearnItem) => {
    setPicked(null);
    onTake(item);
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t("learn.title")}
      fill
      desktop={desktop}
      lead={
        <div data-learn-kinds="" role="group" aria-label={t("learn.title")} className="flex flex-wrap gap-2 pb-3 pt-1">
          {KINDS.map((k) => (
            <FilterChip key={k.id} active={kind === k.id} onClick={() => setPicked(k.id)}>
              {k.label}
            </FilterChip>
          ))}
        </div>
      }
    >
      <div data-learn-choose={kind} className="pb-2 pt-1">
        {kind === "verse" ? <Verses onTake={take} onDaily={close} /> : kind === "quote" ? <Quotes onTake={take} /> : <Own onTake={take} />}
      </div>
    </Sheet>
  );
}

/** One thing to take up: its name, its words, and the mark of the one chosen. */
function Row({
  name,
  nameLang,
  text,
  textLang,
  under,
  current,
  onTake,
  onRemove,
  first,
}: {
  name: string;
  nameLang?: string;
  /** The words, or what stands in their place while they come. */
  text: ReactNode;
  textLang?: string;
  under?: ReactNode;
  current: boolean;
  onTake?: () => void;
  onRemove?: () => void;
  first: boolean;
}) {
  const { t } = useTranslate();
  return (
    <li
      className={cn(
        "flex items-stretch",
        // The one that is lit is one rounded row; the others are parted by a straight line, with none over the first.
        current ? "rounded-[14px] bg-paper/[0.06]" : !first && "border-t border-paper/[0.06]",
      )}
    >
      <button
        type="button"
        data-learn-row=""
        aria-pressed={current}
        disabled={!onTake}
        onClick={onTake}
        className="flex min-h-[56px] min-w-0 flex-1 items-start gap-3 rounded-[14px] px-3 py-3 text-start active:bg-paper/[0.04]"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-detail font-semibold text-paper/85" {...(nameLang ? { lang: nameLang, dir: "ltr" } : {})}>
            {name}
          </span>
          <span className="mt-1 line-clamp-3 font-serif text-[15.5px] leading-[1.5] text-paper/75" {...(textLang ? { lang: textLang, dir: "ltr" } : { dir: "auto" })}>
            {text}
          </span>
          {under}
        </span>
        {current ? <Check size={16} aria-hidden className="shrink-0 self-center text-paper/80" /> : null}
      </button>
      {onRemove ? (
        <button
          type="button"
          data-learn-remove=""
          aria-label={`${t("common.remove")}: ${name}`}
          onClick={onRemove}
          className="tap-press me-1 inline-flex min-h-11 w-11 shrink-0 items-center justify-center self-center rounded-pill text-paper/55 hover:text-paper"
        >
          <Close size={15} />
        </button>
      ) : null}
    </li>
  );
}

// ── A verse ───────────────────────────────────────────────────────────────

function Verses({ onTake, onDaily }: { onTake: (item: LearnItem) => void; onDaily: () => void }) {
  const { t } = useTranslate();
  const { list, chosen, store } = useLearning();
  const books = useMemo(() => localBookNames(t), [t]);
  const [query, setQuery] = useState("");
  const hit = useMemo(() => {
    const q = query.trim();
    if (!/\d/.test(q)) return null;
    return referencesIn(q, books).find((r) => r.kind === "verse") ?? null;
  }, [query, books]);
  const verses = list.filter((v): v is LearnVerse => v.kind === "verse");

  return (
    <>
      <label className="block">
        <span className="sr-only">{t("learn.verseHint")}</span>
        <input
          data-learn-reference=""
          dir="auto"
          type="text"
          inputMode="text"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("learn.verseHint")}
          className={cn(FIELD, "h-12")}
        />
      </label>
      <div aria-live="polite">
        {hit && hit.kind === "verse" ? (
          <Offered
            key={verseKey(hit.book.slug, hit.chapter, hit.verse)}
            book={hit.book.slug}
            chapter={hit.chapter}
            verse={hit.verse}
            label={`${hit.book.name} ${hit.chapter}:${hit.verse}`}
            onTake={onTake}
          />
        ) : /\d/.test(query) && query.trim().length >= 3 ? (
          <p data-learn-none="" className={cn(NOTE, "mt-3")}>
            {t("learn.verseNone")}
          </p>
        ) : null}
      </div>

      {verses.length ? (
        <ul data-learn-list="verse" className="mt-4">
          {verses.map((v, i) => (
            <VerseRow
              key={v.key}
              item={v}
              name={referenceIn(v.label, v.book, books)}
              current={chosen?.key === v.key}
              first={i === 0}
              // One the reader took by its place can be taken off here; a saved verse is taken off where it was saved.
              removable={Boolean(store.items[v.key])}
              onTake={() => {
                choose(v.key);
                onTake(v);
              }}
            />
          ))}
        </ul>
      ) : query.trim() ? null : (
        <p className={cn(NOTE, "mt-4")}>{t("widget.rememberNone")}</p>
      )}

      {chosen && verses.length > 1 ? (
        <button
          type="button"
          data-learn-daily=""
          onClick={() => {
            choose(null);
            onDaily();
          }}
          className={cn(QUIET, "mt-4 h-auto min-h-11 py-2 text-start")}
        >
          {t("learn.daily")}
        </button>
      ) : null}
    </>
  );
}

/** The verse a typed reference names, shown from the Bible the app carries before it is taken. */
function Offered({ book, chapter, verse, label, onTake }: { book: string; chapter: number; verse: number; label: string; onTake: (item: LearnItem) => void }) {
  const { t } = useTranslate();
  const books = useMemo(() => localBookNames(t), [t]);
  const words = useVerseWords(book, chapter, verse, true);
  return (
    <div data-learn-offered="" className="mt-3 rounded-[16px] border border-paper/10 bg-paper/[0.03] px-4 py-3.5">
      <p className="font-sans text-detail font-semibold text-paper/85">{referenceIn(label, book, books)}</p>
      <p className="mt-1 font-serif text-[16px] leading-[1.55] text-paper/85" dir="auto">
        {words.text ?? (words.status === "missing" ? <span className={NOTE}>{t("remember.offline")}</span> : <span className={NOTE}>{t("common.loading")}</span>)}
      </p>
      <button
        type="button"
        data-learn-take=""
        disabled={!words.text}
        onClick={() => {
          const item = verseItem({ book, chapter, verse, label });
          if (!item) return;
          keepItem(item);
          onTake(item);
        }}
        className={cn(SOLID, "mt-3")}
      >
        {t("learn.take")}
      </button>
    </div>
  );
}

function VerseRow({ item, name, current, first, removable, onTake }: { item: LearnVerse; name: string; current: boolean; first: boolean; removable: boolean; onTake: () => void }) {
  const { t } = useTranslate();
  const words = useVerseWords(item.book, item.chapter, item.verse, true);
  return (
    <Row
      name={name}
      text={words.text ?? (words.status === "missing" ? t("saved.openToRead") : t("common.loading"))}
      current={current}
      first={first}
      onTake={onTake}
      onRemove={removable ? () => dropItem(item.key) : undefined}
    />
  );
}

// ── A quote ───────────────────────────────────────────────────────────────

type Asked = { kind: "idle" } | { kind: "busy" } | { kind: "done"; found: FoundAnswer[]; line: string } | { kind: "error"; key: string };

function Quotes({ onTake }: { onTake: (item: LearnItem) => void }) {
  const { t, locale } = useTranslate();
  const { list, chosen } = useLearning();
  const { florilegia } = useFlorilegia();
  const [line, setLine] = useState("");
  const [asked, setAsked] = useState<Asked>({ kind: "idle" });
  const [long, setLong] = useState(false);
  // The answer opens under the field: the sheet moves to it, so it is never below the screen (the owner's rule, build 93 note 15).
  const answer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (asked.kind === "done" || asked.kind === "error") answer.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [asked]);

  // What can be taken: the quotes already on the list, then lines gathered, then the app's own, each once.
  const offers = useMemo(() => {
    const mine: QuoteOffer[] = list.filter((v): v is LearnQuote => v.kind === "quote").map((q) => ({ key: q.key, text: q.text, by: q.by, cite: q.cite }));
    const seen = new Set(mine.map((o) => o.key));
    const rest = [...gatheredQuotes(florilegia), ...carriedQuotes()].filter((o) => (seen.has(o.key) ? false : (seen.add(o.key), true)));
    return { mine: new Set(mine.map((o) => o.key)), all: [...mine, ...rest] };
  }, [list, florilegia]);

  const takeOffer = (o: QuoteOffer) => {
    const item = quoteItem(o);
    if (!item) return;
    keepItem(item);
    onTake(item);
  };
  const takeOwn = (text: string) => {
    const item = ownItem(text);
    if (!item) return;
    keepItem(item);
    onTake(item);
  };

  async function find(e: FormEvent) {
    e.preventDefault();
    setLong(false);
    const q = line.trim();
    if ((q.match(/[\p{L}\p{N}]+/gu) ?? []).length < MIN_WORDS) return setAsked({ kind: "error", key: "whoSaidIt.tooShort" });
    if (typeof navigator !== "undefined" && navigator.onLine === false) return setAsked({ kind: "error", key: "learn.offline" });
    // The keyboard goes down, so the answer has the screen.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setAsked({ kind: "busy" });
    try {
      const res = await apiFetch(`/api/quotes/find?q=${encodeURIComponent(q)}`);
      if (res.status === 429) return setAsked({ kind: "error", key: "whoSaidIt.slow" });
      if (res.status === 400) return setAsked({ kind: "error", key: "whoSaidIt.tooShort" });
      if (!res.ok) return setAsked({ kind: "error", key: "whoSaidIt.error" });
      const body = (await res.json()) as { found: FoundAnswer[] };
      setAsked({ kind: "done", found: body.found ?? [], line: q });
    } catch {
      // No answer at all: the request never reached the website.
      setAsked({ kind: "error", key: "learn.offline" });
    }
  }

  return (
    <>
      <form onSubmit={find}>
        <label className="block">
          <span className="sr-only">{t("whoSaidIt.placeholder")}</span>
          <textarea
            data-learn-paste=""
            dir="auto"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder={t("whoSaidIt.placeholder")}
            rows={3}
            maxLength={600}
            className={cn(FIELD, "resize-none py-3")}
          />
        </label>
        <button type="submit" data-learn-find="" disabled={asked.kind === "busy" || !line.trim()} className={cn(SOLID, "mt-2")}>
          {asked.kind === "busy" ? t("whoSaidIt.searching") : t("whoSaidIt.find")}
        </button>
      </form>

      <div ref={answer} aria-live="polite" className="scroll-mb-4">
        {asked.kind === "error" ? (
          <p data-learn-said={asked.key} className={cn(NOTE, "mt-3")}>
            {t(asked.key)}
          </p>
        ) : null}
        {asked.kind === "done" && asked.found.length === 0 ? (
          <div data-learn-found="none" className="mt-3">
            <p className={NOTE}>{t("whoSaidIt.none")}</p>
            <button
              type="button"
              data-learn-as-own=""
              onClick={() => ([...asked.line].length > OWN_MAX ? setLong(true) : takeOwn(asked.line))}
              className={cn(QUIET, "mt-3")}
            >
              {t("learn.asOwn")}
            </button>
            {long ? <p className={cn(NOTE, "mt-2")}>{t("learn.tooLong")}</p> : null}
          </div>
        ) : null}
        {asked.kind === "done" && asked.found.length > 0 ? (
          <ol className="mt-3">
            {asked.found.map((f, i) => {
              const o = foundQuote(f);
              if (!o) return null;
              return (
                <li key={f.cite.href} data-learn-found={f.match} className={cn("py-3.5", i > 0 && "border-t border-paper/[0.06]")}>
                  <p className={HEAD}>{f.match === "exact" ? t("whoSaidIt.exact") : t("whoSaidIt.close")}</p>
                  <blockquote lang="en" dir="ltr" className="mt-1.5 font-serif text-[16px] leading-[1.6] text-paper/88">
                    {o.text}
                  </blockquote>
                  <SourceLine cite={{ kind: "father", ...o.cite }} className="mt-1.5" />
                  <button type="button" data-learn-take="" onClick={() => takeOffer(o)} className={cn(SOLID, "mt-3")}>
                    {t("learn.take")}
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>

      <p className={cn(HEAD, "mt-6")}>{t("study.theology.fromTheFathers")}</p>
      {/* The books are English editions, and are shown as they print: said, for a reader in another language. */}
      {locale !== "en" ? <p className={cn(NOTE, "mt-1")}>{t("learn.english")}</p> : null}
      <ul data-learn-list="quote" className="mt-1">
        {offers.all.map((o, i) => (
          <Row
            key={o.key}
            name={o.by}
            nameLang="en"
            text={o.text}
            textLang="en"
            under={
              <span lang="en" dir="ltr" className="mt-1 block font-sans text-caption text-paper/55">
                {[o.cite.work, o.cite.place].filter(Boolean).join(", ")}
              </span>
            }
            current={chosen?.key === o.key}
            first={i === 0}
            onTake={() => takeOffer(o)}
            onRemove={offers.mine.has(o.key) ? () => dropItem(o.key) : undefined}
          />
        ))}
      </ul>
    </>
  );
}

// ── Your own words ────────────────────────────────────────────────────────

function Own({ onTake }: { onTake: (item: LearnItem) => void }) {
  const { t } = useTranslate();
  const { list, chosen } = useLearning();
  const [text, setText] = useState("");
  const letters = [...text].length;
  const full = letters >= OWN_MAX;
  const own = list.filter((v) => v.kind === "own");

  function keep(e: FormEvent) {
    e.preventDefault();
    const item = ownItem(text);
    if (!item) return;
    keepItem(item);
    setText("");
    onTake(item);
  }

  return (
    <>
      <form onSubmit={keep}>
        <label className="block">
          <span className="sr-only">{t("learn.ownHint")}</span>
          <textarea
            data-learn-own=""
            dir="auto"
            value={text}
            // Cut by letters, as the list keeps it, so a pasted page is held to a line and said to be.
            onChange={(e) => setText([...e.target.value].slice(0, OWN_MAX).join(""))}
            placeholder={t("learn.ownHint")}
            rows={4}
            className={cn(FIELD, "resize-none py-3")}
          />
        </label>
        <div className="mt-2 flex items-center justify-between gap-3">
          <button type="submit" data-learn-take="" disabled={!text.trim()} className={SOLID}>
            {t("learn.take")}
          </button>
          {letters > OWN_MAX * 0.75 ? (
            <span aria-hidden className="font-sans text-caption tabular-nums text-paper/55">
              {letters}/{OWN_MAX}
            </span>
          ) : null}
        </div>
        <p aria-live="polite" className={cn(NOTE, "mt-2", !full && "sr-only")}>
          {full ? t("learn.tooLong") : ""}
        </p>
      </form>

      {own.length ? (
        <ul data-learn-list="own" className="mt-4">
          {own.map((v, i) =>
            v.kind === "own" ? (
              <Row
                key={v.key}
                name={t("remember.addedByYou")}
                text={v.text}
                current={chosen?.key === v.key}
                first={i === 0}
                onTake={() => {
                  choose(v.key);
                  onTake(v);
                }}
                onRemove={() => dropItem(v.key)}
              />
            ) : null,
          )}
        </ul>
      ) : null}
    </>
  );
}
