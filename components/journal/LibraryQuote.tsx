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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { PlusMark } from "@/components/billing/PlusMark";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SearchField } from "@/components/search/SearchField";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Book } from "@/components/ui/icons/Book";
import { Candle } from "@/components/ui/icons/Candle";
import { ChatBubble } from "@/components/ui/icons/ChatBubble";
import { ClosedBook } from "@/components/ui/icons/ClosedBook";
import { Cross } from "@/components/ui/icons/Cross";
import { Quill } from "@/components/ui/icons/Quill";
import { localBookNames, searchBible } from "@/lib/bible/books";
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

export function LibraryQuote({
  onPick,
  onOwn,
  locked,
  onLocked,
  verseLabel,
}: {
  /** A verse card or a library quote, to lay where the cursor is. */
  onPick: (block: PageBlock) => void;
  /** Words of one's own: the quote typed by hand, as before. */
  onOwn: () => void;
  /** No Plus: the library beyond Scripture wears the mark and opens the upgrade. */
  locked: boolean;
  onLocked: () => void;
  verseLabel: (block: Extract<PageBlock, { type: "verse" }>) => string;
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
      <div data-quote-passages="" className="px-3 pt-1">
        <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => setPage(null)} className={ROW}>
          <ChevronLeft size={18} className="shrink-0 text-paper/80 rtl:-scale-x-100" />
          <span className="min-w-0 flex-1 truncate">{page.sublabel && workAt(page.href) ? `${page.sublabel}, ${page.label}` : page.label}</span>
          <span className="sr-only">{t("common.back")}</span>
        </button>
        <SearchField value={find} onChange={setFind} placeholder={t("journal.page.quoteFind")} />
        <ul className="mt-1 max-h-[38vh] overflow-y-auto">
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
                  <span dir="auto" className="line-clamp-3 font-serif text-body leading-[1.55] text-paper">{p.text}</span>
                </button>
              </li>
            ))
          )}
        </ul>
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
