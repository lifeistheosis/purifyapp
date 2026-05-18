"use client";

import { useEffect, useState } from "react";

/**
 * Live counters drawn from localStorage. Reads on mount and any time a
 * `purify:annotation` or `purify:bookmark` event fires (the in-app
 * annotation & bookmark hooks dispatch both).
 *
 * Four cards: verses highlighted, paragraphs highlighted, notes written,
 * bookmarks saved. The numbers update without a reload because every
 * highlight, note, or bookmark change broadcasts an event we listen to.
 */
export function ProfileStats() {
  const [stats, setStats] = useState({
    verses: 0,
    paragraphs: 0,
    notes: 0,
    bookmarks: 0,
  });

  useEffect(() => {
    function recompute() {
      let verses = 0;
      let paragraphs = 0;
      let notes = 0;
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (!k) continue;
        if (k.startsWith("purify:bible:")) {
          try {
            const v = JSON.parse(window.localStorage.getItem(k) ?? "{}");
            if (v.highlighted) verses++;
            if (typeof v.note === "string" && v.note.trim().length > 0) notes++;
          } catch {
            /* ignore */
          }
        } else if (k.startsWith("purify:saint:")) {
          try {
            const v = JSON.parse(window.localStorage.getItem(k) ?? "{}");
            if (v.highlighted) paragraphs++;
            if (typeof v.note === "string" && v.note.trim().length > 0) notes++;
          } catch {
            /* ignore */
          }
        }
      }
      let bookmarks = 0;
      try {
        const raw = window.localStorage.getItem("purify:bookmarks");
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) bookmarks = arr.length;
        }
      } catch {
        /* ignore */
      }
      setStats({ verses, paragraphs, notes, bookmarks });
    }
    recompute();
    function on(_e: Event) {
      recompute();
    }
    window.addEventListener("purify:annotation", on);
    window.addEventListener("purify:bookmark", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("purify:annotation", on);
      window.removeEventListener("purify:bookmark", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const items = [
    { label: "Verses highlighted", value: stats.verses },
    { label: "Paragraphs highlighted", value: stats.paragraphs },
    { label: "Notes written", value: stats.notes },
    { label: "Bookmarks saved", value: stats.bookmarks },
  ];

  return (
    <section className="mt-8">
      <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
        Your reading
      </p>
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((it) => (
          <li
            key={it.label}
            className="rounded-md border border-paper/12 bg-paper/[0.03] px-5 py-5"
          >
            <p className="font-sans text-[32px] md:text-[36px] font-bold text-[#d4af37] tabular-nums leading-none">
              {it.value}
            </p>
            <p className="mt-2 font-sans text-[12.5px] text-paper/65 leading-[1.4]">
              {it.label}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
