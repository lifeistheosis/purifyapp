"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Close } from "@/components/ui/icons/Close";
import { Search } from "@/components/ui/icons/Search";
import { NAMED_PASSAGES, localBookNames, searchBible, type NamedPassageId, type SearchHit } from "@/lib/bible/books";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { isMultiReferenceQuery, referenceHref } from "@/lib/bible/parseReferences";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { useVisibleFrame } from "@/lib/ui/viewport";

/**
 * Free-form search:
 *   - "john"                  -> filter books matching "john"
 *   - "john 3"                -> /bible/john/3
 *   - "john 3:16"             -> /bible/john/3#v16
 *   - "1 cor 13"              -> /bible/1-corinthians/13
 *   - "gen 1:1"               -> /bible/genesis/1#v1
 *   - "ps 23"                 -> /bible/psalms/23
 *   - "james 2:14-26"         -> /bible/james/2#v14-26   (range; flashes all)
 *   - "1 Tim 2:5, Prov 8:7"   -> /bible/multi?q=...   (multi-verse florilegium)
 *
 * Multi-mode triggers on a comma or semicolon anywhere in the query.
 * The dropdown switches to a single "Open N references" row and Enter
 * routes to the result page rather than navigating to a single hit.
 *
 * `layer` (1.7.1, the owner: search on the Bible screen "conflicts with the
 * bottom and the Matthew one, or like the pill"): on a phone and a tablet in
 * the apps the field opens search as a screen of its own, over the chapter
 * pill, the tab bar and the players, and their places are left as they were.
 * The list ends where the keyboard begins (lib/ui/viewport.ts), Cancel, the
 * back button and Escape leave it, and leaving puts the pill back. The
 * dropdown under the field stays the computer's, where no keyboard rises.
 */
export function BibleSearch({
  className,
  placeholder,
  layer = false,
}: {
  className?: string;
  placeholder?: string;
  /** Open search as its own screen: the phone's and the tablet's row. */
  layer?: boolean;
}) {
  const { t, tn } = useTranslate();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const isMulti = useMemo(() => isMultiReferenceQuery(q), [q]);
  // In multi-mode the dropdown is a single "Open N references" row, so
  // we don't compute fuzzy book hits — `searchBible` is single-ref only.
  // The named passages in the reader's own language, so "Сусанна" finds
  // Susanna as surely as the English does (lib/bible/books.ts NAMED_PASSAGES).
  const localNames = useMemo(() => {
    const out: Partial<Record<NamedPassageId, string>> = {};
    for (const p of NAMED_PASSAGES) out[p.id] = t(`bible.passages.${p.id}`);
    return out;
  }, [t]);
  // And the books in the reader's own language, so "Ioan 3:16" opens John
  // for a Romanian reader as "John 3:16" does (searchBible's `localBooks`).
  const localBooks = useMemo(() => localBookNames(t), [t]);
  const hits: SearchHit[] = useMemo(
    () => (isMulti ? [] : searchBible(q, 8, localNames, localBooks)),
    [q, isMulti, localNames, localBooks],
  );
  // Cheap-but-accurate segment count for the multi-mode preview label.
  const multiCount = useMemo(
    () =>
      isMulti
        ? q.split(/[,;]/).map((s) => s.trim()).filter(Boolean).length
        : 0,
    [q, isMulti],
  );

  useEffect(() => {
    // The dropdown's own way out. The layer is a screen of its own, drawn
    // outside this box, and a tap inside it must not close it.
    if (layer) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [layer]);

  function hrefFor(h: SearchHit): string {
    return h.kind === "book" ? `/bible/${h.book.slug}/1` : referenceHref(h);
  }

  function commit(h: SearchHit | undefined) {
    if (!h) return;
    setOpen(false);
    setQ("");
    router.push(hrefFor(h));
  }

  function commitMulti() {
    if (!q.trim()) return;
    setOpen(false);
    const target = `/bible/multi?q=${encodeURIComponent(q.trim())}`;
    setQ("");
    router.push(target);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isMulti) setActiveIdx((i) => Math.min(hits.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isMulti) setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isMulti) commitMulti();
      else commit(hits[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && q.trim().length > 0;

  // What a query finds: the same rows in the computer's dropdown and in
  // the phone's and tablet's layer.
  const found = (
    isMulti ? (
      // Multi-mode: a single deliberate row that previews the
      // florilegium and routes to the multi-result page on Enter
      // or click. We don't render fuzzy hits underneath because
      // they would be irrelevant noise once the user has typed a
      // comma.
      <button
        type="button"
        onClick={commitMulti}
        className="block w-full text-left px-4 py-3 font-sans text-ui bg-paper/10 text-paper hover:bg-paper/[0.15] transition-colors"
      >
        <span className="font-medium">
          {tn("bible.openReferences", multiCount)}
        </span>
        <span className="block text-caption text-paper/55 mt-0.5">
          {t("bible.pressEnterMulti")}
        </span>
      </button>
    ) : hits.length === 0 ? (
      <p className="px-4 py-3 font-sans text-ui text-paper/55">
        {t("bible.noMatches")}
      </p>
    ) : (
      <ul role="listbox">
        {hits.map((h, i) => {
          const bookName = t(`bible.books.${h.book.slug}`);
          // A named passage leads with its own name, and says where it
          // lives underneath, because the reader searched for the name.
          const passage = h.kind === "chapter" || h.kind === "verse" ? h.passage : undefined;
          const where =
            h.kind === "verse"
              ? `${bookName} ${h.chapter}:${h.verse}`
              : h.kind === "chapter"
                ? `${bookName} ${h.chapter}`
                : bookName;
          const label = passage
            ? t(`bible.passages.${passage}`)
            : h.kind === "verse"
              ? `${bookName} ${h.chapter}:${h.verse}`
              : h.kind === "range"
                ? `${bookName} ${h.chapter}:${h.verseFrom}–${h.verseTo}`
                : h.kind === "chapter"
                  ? `${bookName} ${h.chapter}`
                  : bookName;
          const sub = passage
            ? where
            : h.kind === "verse"
              ? t("bible.hitVerseSub", {
                  verse: h.verse,
                  chapter: h.chapter,
                })
              : h.kind === "range"
                ? tn(
                    "bible.hitRangeSub",
                    h.verseTo - h.verseFrom + 1,
                    {
                      from: h.verseFrom,
                      to: h.verseTo,
                      chapter: h.chapter,
                    },
                  )
                : h.kind === "chapter"
                  ? t("bible.hitChapterSub", {
                      chapter: h.chapter,
                      total: h.book.chapters,
                    })
                  : tn(
                      h.book.testament === "OT"
                        ? "bible.hitBookSubOt"
                        : "bible.hitBookSubNt",
                      h.book.chapters,
                    );
          const key = passage
            ? `passage-${passage}`
            : h.kind === "verse"
              ? `${h.book.slug}-v-${h.chapter}-${h.verse}`
              : h.kind === "range"
                ? `${h.book.slug}-r-${h.chapter}-${h.verseFrom}-${h.verseTo}`
                : h.kind === "chapter"
                  ? `${h.book.slug}-c-${h.chapter}`
                  : `${h.book.slug}-b`;
          return (
            <li key={key} role="option" aria-selected={i === activeIdx}>
              <Link
                href={hrefFor(h)}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => {
                  setOpen(false);
                  setQ("");
                }}
                className={
                  "block px-4 py-3 font-sans text-ui " +
                  (i === activeIdx
                    ? "bg-paper/10 text-paper"
                    : "text-paper/85 hover:bg-paper/5")
                }
              >
                <span className="font-medium">{label}</span>
                <span className="block text-caption text-paper/45 mt-0.5">
                  {sub}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    )
  );

  if (layer) {
    return (
      <div ref={containerRef} className={`relative z-20 ${className ?? ""}`}>
        {/* The field at rest, drawn as it always was. A tap opens search as
            its own screen rather than typing here, under the pill. */}
        <button
          type="button"
          data-bible-search-open
          aria-haspopup="dialog"
          aria-label={t("bible.searchAria")}
          onClick={() => {
            setQ("");
            setActiveIdx(0);
            setOpen(true);
          }}
          className="relative flex w-full items-center rounded-pill border border-paper/15 bg-paper/[0.04] py-3 pl-10 pr-4 text-start font-sans text-ui text-paper/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          <Search aria-hidden className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-paper/40" />
          <span className="truncate">{placeholder ?? t("bible.searchPlaceholder")}</span>
        </button>
        {open ? (
          <SearchLayer
            q={q}
            placeholder={placeholder ?? t("bible.searchPlaceholder")}
            onChange={(value) => {
              setQ(value);
              setActiveIdx(0);
            }}
            onKeyDown={onKey}
            onClose={() => {
              setOpen(false);
              setQ("");
            }}
          >
            {q.trim() ? (
              found
            ) : (
              <p className="px-4 py-6 font-sans text-detail leading-[1.55] text-paper/55">{t("bible.tryExamples")}</p>
            )}
          </SearchLayer>
        ) : null}
      </div>
    );
  }

  return (
    // `z-20` matches SaintSearch: this wrapper is a stacking context for the
    // length of the entrance animation, and the dropdown must clear whatever
    // block follows it on the page.
    <div ref={containerRef} className={`relative z-20 ${className ?? ""}`}>
      <div className="relative">
        <Search
          aria-hidden
          className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 h-4 w-4"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActiveIdx(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder ?? t("bible.searchPlaceholder")}
          aria-label={t("bible.searchAria")}
          className="w-full bg-paper/[0.04] border border-paper/15 rounded-pill pl-10 pr-4 py-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/40 transition-colors duration-150"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-2 left-0 right-0 rounded-md border border-paper/15 bg-night shadow-lg max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain scrollbar-thin">
          {found}
        </div>
      )}
    </div>
  );
}

/**
 * Search as a screen of its own, on a phone and a tablet in the apps (1.7.1).
 * The search palette's phone layout (components/search/CommandPalette.tsx):
 * a round field with Cancel beside it under the status bar, and the results
 * under it to where the keyboard begins. Drawn on the body, over the chapter
 * pill, the tab bar, today's readings and the players, which stay where they
 * are and come back as they were when it closes. The tab bar and the way out
 * of focus also step aside for it (lib/ui/overlay.ts). No blur: a blurred
 * layer is redrawn on every frame on Android.
 */
function SearchLayer({
  q,
  placeholder,
  onChange,
  onKeyDown,
  onClose,
  children,
}: {
  q: string;
  placeholder: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslate();
  // What the keyboard leaves of the screen (lib/ui/viewport.ts).
  const frame = useVisibleFrame();
  const inputRef = useRef<HTMLInputElement>(null);

  // The field takes the focus in the tap that opened it, so a phone raises
  // its keyboard at once (iOS raises it only inside the reader's own tap).
  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setOverlayOpen(true);
    lockBodyScroll();
    return () => {
      setOverlayOpen(false);
      unlockBodyScroll();
    };
  }, []);

  // Android's back button leaves search, not the chapter.
  useAndroidBack(true, onClose);

  return createPortal(
    <div
      data-bible-search-layer
      role="dialog"
      aria-modal="true"
      aria-label={t("bible.searchAria")}
      className="fixed inset-0 z-[120] bg-night"
    >
      <div
        className="absolute inset-x-0 top-0 flex h-full flex-col"
        style={frame ? { top: frame.top, height: frame.height } : undefined}
      >
        <div
          className="mx-auto flex w-full max-w-[680px] shrink-0 items-center gap-1.5 border-b border-paper/10 px-3 pb-2.5"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.625rem)" }}
        >
          <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-pill border border-paper/15 bg-paper/[0.05] pl-3.5 pr-1 focus-within:border-paper/45 motion-safe:transition-colors">
            <Search size={18} aria-hidden className="shrink-0 text-paper/45" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              aria-label={t("bible.searchAria")}
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-2.5 font-sans text-body text-paper placeholder:text-paper/35"
              // The field's own frame says where typing goes; the app-wide
              // focus ring is a square box across its round ends.
              style={{ outline: "none" }}
            />
            {q ? (
              <button
                type="button"
                aria-label={t("study.clear")}
                onClick={() => {
                  onChange("");
                  inputRef.current?.focus();
                }}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-paper/55 hover:text-paper"
              >
                <Close size={16} />
              </button>
            ) : null}
          </label>
          {/* A phone has no Escape key, so it gets a word to tap. */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 shrink-0 items-center rounded-pill px-2.5 font-sans text-detail font-medium text-paper/75 hover:text-paper"
          >
            {t("common.cancel")}
          </button>
        </div>
        <div
          data-bible-search-results
          className="mx-auto min-h-0 w-full max-w-[680px] flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
