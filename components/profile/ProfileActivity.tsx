"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Bookmark = {
  id: string;
  kind: "bible-verse" | "bible-chapter" | "writing-section";
  locator: {
    book?: string;
    chapter?: number;
    verse?: number;
    saintSlug?: string;
    workSlug?: string;
    sectionN?: number;
  };
  addedAt: string;
  label?: string;
};

function hrefFor(b: Bookmark): string {
  const l = b.locator ?? {};
  switch (b.kind) {
    case "bible-verse":
      return `/bible/${l.book}/${l.chapter}#v${l.verse}`;
    case "bible-chapter":
      return `/bible/${l.book}/${l.chapter}`;
    case "writing-section":
      return `/saints/${l.saintSlug}/${l.workSlug}#s${l.sectionN}`;
    default:
      return "/saved";
  }
}

function relativeShort(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return "Just now";
  const m = Math.floor(diffMs / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * "Last saved" strip on the account dashboard — the three most recent
 * bookmarks (verse, chapter, or saint writing section), each a one-tap
 * link back into its target. Reads the same localStorage shape
 * `lib/sync/bookmarks.ts` works with. Updates in real time via the
 * `purify:bookmark` event the bookmark hook already dispatches.
 */
export function ProfileActivity() {
  const [items, setItems] = useState<Bookmark[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    function recompute() {
      try {
        const raw = window.localStorage.getItem("purify:bookmarks");
        if (!raw) {
          setItems([]);
          return;
        }
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) {
          setItems([]);
          return;
        }
        const sorted = (arr as Bookmark[])
          .filter((b) => b && b.addedAt)
          .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
          .slice(0, 3);
        setItems(sorted);
      } catch {
        setItems([]);
      }
    }
    recompute();
    setHydrated(true);
    const on = () => recompute();
    window.addEventListener("purify:bookmark", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("purify:bookmark", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55">
          Last saved
        </p>
        <Link
          href="/saved"
          className="font-sans text-[12px] text-paper/55 hover:text-paper transition-colors"
        >
          See all →
        </Link>
      </div>
      {hydrated && items.length === 0 ? (
        <div className="rounded-md border border-paper/12 bg-paper/[0.02] px-5 py-6 font-serif italic text-[14.5px] text-paper/55 leading-[1.55]">
          Nothing saved yet. Bookmark a verse on any chapter, or a section in a
          saint's writing, and it will show up here.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {items.map((b) => (
            <li key={b.id}>
              <Link
                href={hrefFor(b)}
                className="group block h-full rounded-md border border-paper/12 bg-paper/[0.03] hover:border-gold/45 hover:bg-gold/[0.04] transition-colors px-4 py-4"
              >
                <p className="font-sans text-[10.5px] uppercase tracking-[1.5px] text-gold/75 font-semibold">
                  {b.kind === "bible-verse"
                    ? "Verse"
                    : b.kind === "bible-chapter"
                      ? "Chapter"
                      : "Writing"}
                </p>
                <p className="mt-1.5 font-display-serif text-[16px] text-paper leading-tight line-clamp-2">
                  {b.label || hrefFor(b)}
                </p>
                <p className="mt-2 font-sans text-[11.5px] text-paper/45">
                  {relativeShort(b.addedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
