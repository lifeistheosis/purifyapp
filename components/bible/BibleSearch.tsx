"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { searchBible, type SearchHit } from "@/lib/bible/books";

/**
 * Free-form search:
 *   - "john"            -> filter books matching "john"
 *   - "john 3"          -> /bible/john/3
 *   - "john 3:16"       -> /bible/john/3#v16
 *   - "1 cor 13"        -> /bible/1-corinthians/13
 *   - "gen 1:1"         -> /bible/genesis/1#v1
 *   - "ps 23"           -> /bible/psalms/23
 *   - "james 2:14-26"   -> /bible/james/2#v14-26   (range; flashes all)
 */
export function BibleSearch({
  className,
  placeholder = "Search book, chapter, verse, or range (e.g. John 3:16, James 2:14-26, Ps 23)",
}: {
  className?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const hits: SearchHit[] = useMemo(() => searchBible(q, 8), [q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function hrefFor(h: SearchHit): string {
    if (h.kind === "verse")
      return `/bible/${h.book.slug}/${h.chapter}#v${h.verse}`;
    if (h.kind === "range")
      return `/bible/${h.book.slug}/${h.chapter}#v${h.verseFrom}-${h.verseTo}`;
    if (h.kind === "chapter") return `/bible/${h.book.slug}/${h.chapter}`;
    return `/bible/${h.book.slug}/1`;
  }

  function commit(h: SearchHit | undefined) {
    if (!h) return;
    setOpen(false);
    setQ("");
    router.push(hrefFor(h));
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(hits.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(hits[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && q.trim().length > 0;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
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
          placeholder={placeholder}
          aria-label="Search the Bible"
          className="w-full bg-paper/[0.04] border border-paper/15 rounded-pill pl-10 pr-4 py-3 font-sans text-[15px] text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/40 transition-colors duration-150"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-2 left-0 right-0 rounded-md border border-paper/15 bg-night shadow-lg overflow-hidden">
          {hits.length === 0 ? (
            <p className="px-4 py-3 font-sans text-[14px] text-paper/55">
              No matches.
            </p>
          ) : (
            <ul role="listbox">
              {hits.map((h, i) => {
                const label =
                  h.kind === "verse"
                    ? `${h.book.name} ${h.chapter}:${h.verse}`
                    : h.kind === "range"
                      ? `${h.book.name} ${h.chapter}:${h.verseFrom}–${h.verseTo}`
                      : h.kind === "chapter"
                        ? `${h.book.name} ${h.chapter}`
                        : h.book.name;
                const sub =
                  h.kind === "verse"
                    ? `Verse ${h.verse} of chapter ${h.chapter}`
                    : h.kind === "range"
                      ? `Verses ${h.verseFrom}–${h.verseTo} of chapter ${h.chapter} · ${h.verseTo - h.verseFrom + 1} verses`
                      : h.kind === "chapter"
                        ? `Chapter ${h.chapter} of ${h.book.chapters}`
                        : `${h.book.chapters} chapters · ${h.book.testament === "OT" ? "Old Testament" : "New Testament"}`;
                const key =
                  h.kind === "verse"
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
                        "block px-4 py-3 font-sans text-[15px] " +
                        (i === activeIdx
                          ? "bg-paper/10 text-paper"
                          : "text-paper/85 hover:bg-paper/5")
                      }
                    >
                      <span className="font-medium">{label}</span>
                      <span className="block text-[12px] text-paper/45 mt-0.5">
                        {sub}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
