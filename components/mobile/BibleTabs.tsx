"use client";

// Minimal book selector for the Bible mobile shell. Two segmented tabs
// (Old / New Testament), a quiet vertical list of books grouped by
// category, persisted tab choice in localStorage.
//
// No book-spine illustrations, no horizontal scroll, no coloured chips.
// One tap target per book.

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BookCategory } from "@/lib/bible/books";

type Tab = "ot" | "nt";
const STORAGE_KEY = "purify:bible:lastTestament";

export function BibleTabs({
  ot,
  nt,
}: {
  ot: BookCategory[];
  nt: BookCategory[];
}) {
  const [tab, setTab] = useState<Tab>("nt");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- adopt the
         persisted tab after mount; the server must render the default. */
      if (raw === "ot" || raw === "nt") setTab(raw);
    } catch {
      /* ignore */
    }
  }, []);

  function pick(next: Tab) {
    setTab(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const cats = tab === "ot" ? ot : nt;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Testament"
        className="grid grid-cols-2 gap-1 rounded-full border border-paper/10 bg-paper/[0.03] p-1"
      >
        <TabButton active={tab === "ot"} onClick={() => pick("ot")}>
          Old Testament
        </TabButton>
        <TabButton active={tab === "nt"} onClick={() => pick("nt")}>
          New Testament
        </TabButton>
      </div>

      <div className="mt-5 space-y-6">
        {cats.map((cat) => (
          <CategoryBlock key={cat.label} cat={cat} />
        ))}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        "rounded-full py-2 font-sans text-detail font-semibold transition-colors " +
        (active ? "bg-paper text-night" : "text-paper/65 hover:text-paper")
      }
    >
      {children}
    </button>
  );
}

function CategoryBlock({ cat }: { cat: BookCategory }) {
  return (
    <section>
      <p className="font-sans text-eyebrow uppercase tracking-[1.8px] text-paper/45 mb-2 px-1">
        {cat.label}
      </p>
      <ul className="rounded-2xl border border-paper/10 bg-paper/[0.03] overflow-hidden">
        {cat.books.map((b, i) => (
          <li
            key={b.slug}
            className={i > 0 ? "border-t border-paper/[0.06]" : ""}
          >
            <Link
              href={`/bible/${b.slug}/1`}
              className="flex items-center justify-between gap-3 px-4 py-3 active:bg-paper/[0.04] transition-colors"
            >
              <span className="font-sans text-ui text-paper leading-tight">
                {b.name}
              </span>
              <span className="shrink-0 font-sans text-caption tabular-nums text-paper/45">
                {b.chapters} ch
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
