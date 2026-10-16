"use client";

// One thing kept, as one clean row (1.7, the owner's note 21: "each item one
// clean row: what it is in small text, the words or title, where it is from;
// tap opens it in place, swipe to remove").
//
//   line 1, small: what it is, with a small dot of its colour before it when
//                  it is highlighted ("Highlight · Key verse"), and the date
//   line 2:        a verse's words in Lora, or the title of anything else
//   line 3, small: where it is from ("John 3:16")
//
// No card, no icon tile, no stripe: the list draws hairlines between rows.
// A verse with only some words highlighted shows those words at full
// strength and the rest of the verse a step back.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { KIND_LABEL_KEY, savedSource, savedTitle, shortDate } from "@/components/saved/kinds";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { colorById, useHighlightLegend } from "@/lib/bible/highlightColors";
import { bookmarkHref } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";
import type { SavedItem } from "@/lib/saved/feed";
import { useVerseWords } from "@/lib/saved/verseWords";

/** True once the element has come near the screen; it stays true. */
function useNearScreen<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near];
}

/** The verse a row is about, if it is one. */
export function verseOf(item: SavedItem): { book: string; chapter: number; verse: number } | null {
  const b = item.bookmark;
  if (b?.kind === "bible-verse") return { book: b.book, chapter: b.chapter, verse: b.verse };
  if (!b && item.highlight) return { book: item.highlight.book, chapter: item.highlight.chapter, verse: item.highlight.verse };
  return null;
}

export function SavedRow({
  item,
  onRemove,
  verseLabel,
}: {
  item: SavedItem;
  onRemove: (item: SavedItem) => void;
  /** "John 3:16" in the reader's language. */
  verseLabel: (book: string, chapter: number, verse: number) => string;
}) {
  const { t, locale } = useTranslate();
  const { labelFor } = useHighlightLegend();
  const [ref, near] = useNearScreen<HTMLAnchorElement>();
  const b = item.bookmark;
  const h = item.highlight;
  const verse = verseOf(item);

  const kind = b ? t(KIND_LABEL_KEY[b.kind]) : t("saved.kind.highlight");
  const meaning = h ? labelFor(h.color) : null;
  const thisYear = item.at !== null && new Date(item.at).getFullYear() === new Date().getFullYear();
  const date = item.at !== null ? shortDate(item.at, locale, !thisYear) : "";
  const href = b ? bookmarkHref(b) : `/bible/${h!.book}/${h!.chapter}#v${h!.verse}`;
  const source = verse ? verseLabel(verse.book, verse.chapter, verse.verse) : b ? savedSource(b) : null;

  return (
    <SwipeRow onRemove={() => onRemove(item)} removeLabel={t("common.remove")}>
      <Link ref={ref} href={href} data-saved-row="" className="block py-4 pe-1 motion-safe:transition-opacity active:opacity-80">
        <p className="flex min-w-0 items-center gap-2 font-sans text-caption text-paper/55">
          {h ? (
            <span aria-hidden data-saved-dot={h.color} className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorById(h.color).swatch }} />
          ) : null}
          <span className="min-w-0 truncate">{meaning ? `${kind} · ${meaning}` : kind}</span>
          {date ? <span className="ms-auto shrink-0 ps-3 tabular-nums">{date}</span> : null}
        </p>
        {verse ? (
          <VerseWords book={verse.book} chapter={verse.chapter} verse={verse.verse} near={near} words={h && !h.whole ? h.words : null} />
        ) : (
          <p className="mt-1 line-clamp-2 font-sans text-ui font-semibold leading-snug text-paper">{b ? savedTitle(b) : ""}</p>
        )}
        {source ? <p className="mt-1 truncate font-sans text-caption text-paper/55">{source}</p> : null}
      </Link>
    </SwipeRow>
  );
}

function VerseWords({
  book,
  chapter,
  verse,
  near,
  words,
}: {
  book: string;
  chapter: number;
  verse: number;
  near: boolean;
  /** Only these words are highlighted (by index), when not the whole verse. */
  words: number[] | null;
}) {
  const { t } = useTranslate();
  const state = useVerseWords(book, chapter, verse, near);
  if (!state.text) {
    return (
      <p className="mt-1.5 font-sans text-detail text-paper/45">
        {state.status === "missing" ? t("saved.openToRead") : t("common.loading")}
      </p>
    );
  }
  if (words && words.length) {
    const lit = new Set(words);
    const parts = state.text.trim().split(/\s+/);
    return (
      <p className="mt-1.5 line-clamp-3 font-serif text-body leading-[1.55] text-paper/70">
        {parts.map((w, i) => (
          <span key={i} className={cn(lit.has(i) && "text-paper")}>
            {i > 0 ? " " : ""}
            {w}
          </span>
        ))}
      </p>
    );
  }
  return <p className="mt-1.5 line-clamp-3 font-serif text-body leading-[1.55] text-paper/90">{state.text}</p>;
}
