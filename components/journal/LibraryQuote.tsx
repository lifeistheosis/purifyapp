"use client";

// The editor's Quote: a search of Purify's library (build 98 note 5;
// lib/journal/libraryQuote.ts says what it searches and how a passage lands).
//
// Built from the editor's own parts, so it moves unchanged into the journal's
// own page when that is drawn: the Verse tool's field (SearchField) and rows,
// More's Plus mark, the house's icons. First the reader finds a page (a verse
// lands as its card at once); then the page's passages, with the same field to
// find the words in them; a passage tapped lands as a library quote. Words of
// one's own stay the last row, the second choice.
//
// On the journal's own page (1.9, Fable round 3) it stands in the page's one
// sheet (components/journal/WriteSheet.tsx), `inSheet`: the same search and
// the same passages, laid out as that sheet's rows are. What answers is
// grouped by where it is from (Scripture, the Fathers, the saints' lives, the
// prayers, the councils), each group under its name as the small line, with
// the Plus mark once beside the name for a reader without Plus; a row is a
// name, one line and the chevron, with no glyph; and words of one's own are
// the second, quieter choice under the field. The sheet scrolls, so the lists
// keep no height of their own.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { PlusMark } from "@/components/billing/PlusMark";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SearchField } from "@/components/search/SearchField";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Book } from "@/components/ui/icons/Book";
import { Candle } from "@/components/ui/icons/Candle";
import { ChatBubble } from "@/components/ui/icons/ChatBubble";
import { ClosedBook } from "@/components/ui/icons/ClosedBook";
import { Cross } from "@/components/ui/icons/Cross";
import { Quill } from "@/components/ui/icons/Quill";
import { localBookNames, searchBible } from "@/lib/bible/books";
import { cn } from "@/lib/cn";
import { isWriting } from "@/lib/journal/writing";
import { libraryPages, pagePassages, passageQuote, passagesWith, quoteNeedsPlus, workAt, workPassages, type Passage } from "@/lib/journal/libraryQuote";
import { verseBlock, type PageBlock } from "@/lib/journal/page";
import type { SearchItem } from "@/lib/search/types";
import { fetchWriting } from "@/lib/saints/writingClient";

/** The app's search corpus, read once a visit with a relative address (the website's file, the apps' own copy). */
let corpus: Promise<SearchItem[]> | null = null;
function loadCorpus(): Promise<SearchItem[]> {
  corpus ??= fetch("/search-corpus.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((items: unknown) => (Array.isArray(items) ? (items as SearchItem[]) : []))
    .catch(() => {
      corpus = null;
      return [];
    });
  return corpus;
}

/** A page's passages: a Father's work from its file, any other page from the page itself. */
async function loadPassages(page: SearchItem): Promise<Passage[]> {
  const work = workAt(page.href);
  if (work) return workPassages(await fetchWriting(work.saint, work.work));
  try {
    const r = await fetch(page.href.split("#")[0]);
    if (!r.ok) return [];
    return pagePassages(new DOMParser().parseFromString(await r.text(), "text/html"));
  } catch {
    return [];
  }
}

const ROW = "tap-press flex min-h-11 w-full min-w-0 items-center gap-3 rounded-xl px-2 py-1.5 text-start font-sans text-ui text-paper hover:bg-paper/[0.06]";

function iconFor(page: SearchItem) {
  if (workAt(page.href)) return <Quill size={18} />;
  if (page.group === "Councils & Heresies") return <ClosedBook size={18} />;
  if (page.group === "Prayers") return <Candle size={18} />;
  return <Cross size={18} />;
}

/** Where a page of the library is from, in the order the sheet's groups stand, each with the catalogue's own name for it. */
const FROM = [
  { id: "fathers", key: "footer.theFathers" },
  { id: "lives", key: "home.pillars.saints.title" },
  { id: "prayers", key: "nav.prayers" },
  { id: "councils", key: "nav.councils" },
] as const;
type From = (typeof FROM)[number]["id"];

/** A Father's work is the Fathers' wherever the list files it; a saint's own page is his life. */
export function quoteFrom(page: Pick<SearchItem, "href" | "group">): From {
  if (workAt(page.href) || page.group === "Reading") return "fathers";
  if (page.group === "Prayers") return "prayers";
  if (page.group === "Councils & Heresies") return "councils";
  return "lives";
}

/** A group's name in the sheet: the small line, and the Plus mark where the group is Plus's. */
function GroupName({ name, mark = false }: { name: string; mark?: boolean }) {
  return (
    <p role="heading" aria-level={3} className="flex min-h-9 items-center gap-2 px-1 font-sans text-caption font-semibold text-paper/55">
      {name}
      {mark ? <PlusMark /> : null}
    </p>
  );
}

/** The sheet's row: a name, one line, the chevron; a hairline between rows (.theology-rule). */
const SHEET_ROW = "theology-row tap-press flex min-h-[52px] w-full min-w-0 items-center gap-3 rounded-[14px] px-1 py-2 text-start";

export function LibraryQuote({
  onPick,
  onOwn,
  locked,
  onLocked,
  verseLabel,
  inSheet = false,
  onStep,
}: {
  /** A verse card or a library quote, to lay where the cursor is. */
  onPick: (block: PageBlock) => void;
  /** Words of one's own: the quote typed by hand, as before. */
  onOwn: () => void;
  /** No Plus: the library beyond Scripture wears the mark and opens the upgrade. */
  locked: boolean;
  onLocked: () => void;
  verseLabel: (block: Extract<PageBlock, { type: "verse" }>) => string;
  /** In the writing page's one sheet: grouped by where from, rows with no glyph, words of one's own under the field. */
  inSheet?: boolean;
  /**
   * In the sheet: told the way back from a page's passages to the results
   * while a page is open, and null when none is, so the sheet's own way back
   * takes that step first and one chevron serves both.
   */
  onStep?: (back: (() => void) | null) => void;
}) {
  const { t } = useTranslate();
  const books = useMemo(() => localBookNames(t), [t]);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [page, setPage] = useState<SearchItem | null>(null);
  const [passages, setPassages] = useState<Passage[] | null>(null);
  const [find, setFind] = useState("");
  const input = useRef<HTMLInputElement | null>(null);

  // As the Verse tool: the cursor from a reader who is writing, nothing from one who is not.
  useLayoutEffect(() => {
    if (isWriting()) input.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    let live = true;
    void loadCorpus().then((c) => live && setItems(c));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!page) return;
    let live = true;
    void loadPassages(page).then((p) => live && setPassages(p));
    return () => {
      live = false;
    };
  }, [page]);

  useEffect(() => {
    if (!onStep) return;
    onStep(page ? () => setPage(null) : null);
    return () => onStep(null);
  }, [page, onStep]);

  const verses = useMemo(() => {
    const out: Extract<PageBlock, { type: "verse" }>[] = [];
    for (const h of searchBible(q, 4, {}, books)) {
      const b = h.kind === "verse" ? verseBlock(h.book.slug, h.chapter, h.verse) : null;
      if (b && b.type === "verse" && !out.some((o) => o.book === b.book && o.chapter === b.chapter && o.from === b.from)) out.push(b);
      if (out.length === 2) break;
    }
    return out;
  }, [q, books]);
  const pages = useMemo(() => libraryPages(items, q), [items, q]);
  const shown = useMemo(() => (passages ? passagesWith(passages, find) : []), [passages, find]);

  const open = (p: SearchItem) => {
    if (locked && quoteNeedsPlus(p.href)) return onLocked();
    setPassages(null);
    setFind("");
    setPage(p);
  };

  if (page) {
    return (
      <div data-quote-passages="" className={inSheet ? undefined : "px-3 pt-1"}>
        {inSheet ? (
          // The page the passages are from, whole: the sheet's own chevron is the way back to the results.
          <p data-quote-from="" className="px-1 pb-2 font-sans text-detail font-semibold leading-[1.4] text-paper/85">
            {page.sublabel && workAt(page.href) ? `${page.sublabel}, ${page.label}` : page.label}
          </p>
        ) : (
          <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => setPage(null)} className={ROW}>
            <ChevronLeft size={18} className="shrink-0 text-paper/80 rtl:-scale-x-100" />
            <span className="min-w-0 flex-1 truncate">{page.sublabel && workAt(page.href) ? `${page.sublabel}, ${page.label}` : page.label}</span>
            <span className="sr-only">{t("common.back")}</span>
          </button>
        )}
        <SearchField value={find} onChange={setFind} placeholder={t("journal.page.quoteFind")} />
        <ul className={cn("mt-1", !inSheet && "max-h-[38vh] overflow-y-auto")}>
          {passages === null ? (
            <li className="flex min-h-11 items-center px-2 font-sans text-ui text-paper/80">{t("common.loading")}</li>
          ) : shown.length === 0 ? (
            <li className="flex min-h-11 items-center px-2 font-sans text-ui text-paper/80">{t("search.nothingFound", { query: find || page.label })}</li>
          ) : (
            shown.map((p, i) => (
              <li key={`${p.anchor ?? ""}-${i}`}>
                <button
                  type="button"
                  data-quote-passage=""
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const block = passageQuote(page, p);
                    if (block) onPick(block);
                  }}
                  className="tap-press block min-h-11 w-full rounded-xl px-2 py-2 text-start hover:bg-paper/[0.06]"
                >
                  {/* Whole: what the reader reads here is what lands, word for word. */}
                  <span dir="auto" data-mock-allow="emdash" data-mock-why="a passage of the library, as its edition prints it" className="block font-serif text-body leading-[1.55] text-paper">
                    {p.text}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    );
  }

  if (inSheet) {
    const groups = FROM.map((f) => ({ ...f, pages: pages.filter((p) => quoteFrom(p) === f.id) })).filter((g) => g.pages.length > 0);
    return (
      <div data-quote-library="">
        <SearchField
          value={q}
          onChange={setQ}
          inputRef={input}
          placeholder={t("study.theology.searchLibrary")}
          onSubmit={() => (verses[0] ? onPick(verses[0]) : pages[0] ? open(pages[0]) : undefined)}
        />
        {/* The second, quieter choice: words the writer types, with the writer's own word for who said them. */}
        <button
          type="button"
          data-quote-own=""
          onPointerDown={(e) => e.preventDefault()}
          onClick={onOwn}
          className="tap-press mt-1 inline-flex min-h-11 items-center px-1 font-sans text-detail font-semibold text-paper/70 underline underline-offset-4 hover:text-paper"
        >
          {t("journal.page.quoteOwn")}
        </button>
        {verses.length > 0 ? (
          <section data-quote-group="scripture" className="mt-1">
            <GroupName name={t("bible.eyebrow")} />
            <ul>
              {verses.map((b) => (
                <li key={`${b.book}-${b.chapter}-${b.from}`} className="theology-rule">
                  <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => onPick(b)} className={SHEET_ROW}>
                    <span className="min-w-0 flex-1 font-sans text-ui font-semibold text-paper">{verseLabel(b)}</span>
                    <ChevronRight aria-hidden size={14} className="shrink-0 text-paper/50 rtl:-scale-x-100" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {groups.map((g) => (
          <section key={g.id} data-quote-group={g.id} className="mt-3">
            <GroupName name={t(g.key)} mark={locked} />
            <ul>
              {g.pages.map((p) => (
                <li key={p.id} className="theology-rule">
                  <button type="button" data-quote-page={p.href} onPointerDown={(e) => e.preventDefault()} onClick={() => open(p)} className={SHEET_ROW}>
                    <span className="min-w-0 flex-1">
                      <span className="block font-sans text-ui font-semibold leading-tight text-paper">{p.label}</span>
                      {p.sublabel ? <span className="mt-0.5 block font-sans text-caption text-paper/60">{p.sublabel}</span> : null}
                    </span>
                    <ChevronRight aria-hidden size={14} className="shrink-0 text-paper/50 rtl:-scale-x-100" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {q.trim().length >= 2 && verses.length === 0 && groups.length === 0 && items.length > 0 ? (
          <p aria-live="polite" className="mt-3 px-1 font-sans text-detail leading-[1.5] text-paper/70">
            {t("search.nothingFound", { query: q.trim() })}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div data-quote-library="" className="px-3 pt-2">
      <SearchField
        value={q}
        onChange={setQ}
        inputRef={input}
        placeholder={t("study.theology.searchLibrary")}
        onSubmit={() => (verses[0] ? onPick(verses[0]) : pages[0] ? open(pages[0]) : undefined)}
      />
      <ul className="mt-1 max-h-[38vh] overflow-y-auto">
        {verses.map((b) => (
          <li key={`${b.book}-${b.chapter}-${b.from}`}>
            <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => onPick(b)} className={ROW}>
              <Book size={18} className="shrink-0 text-paper/80" />
              <span className="min-w-0 flex-1 truncate">{verseLabel(b)}</span>
            </button>
          </li>
        ))}
        {pages.map((p) => (
          <li key={p.id}>
            <button type="button" data-quote-page={p.href} onPointerDown={(e) => e.preventDefault()} onClick={() => open(p)} className={ROW}>
              <span className="shrink-0 text-paper/80">{iconFor(p)}</span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate">{p.label}</span>
                {p.sublabel ? <span className="block truncate text-detail text-paper/80">{p.sublabel}</span> : null}
              </span>
              {locked && quoteNeedsPlus(p.href) ? <PlusMark className="shrink-0" /> : null}
            </button>
          </li>
        ))}
        <li>
          <button type="button" data-quote-own="" onPointerDown={(e) => e.preventDefault()} onClick={onOwn} className={ROW}>
            <ChatBubble size={18} className="shrink-0 text-paper/80" />
            <span className="min-w-0 flex-1 truncate">{t("journal.page.quoteOwn")}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
