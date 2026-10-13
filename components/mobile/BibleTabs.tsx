"use client";

// Minimal book selector for the Bible mobile shell. Two segmented tabs
// (Old / New Testament), a quiet vertical list of books grouped by
// category, persisted tab choice in localStorage.
//
// No book-spine illustrations, no horizontal scroll, no coloured chips.
// One tap target per book. The rows are the tab's one row language
// (IndexRows.tsx), which the rows above this list are drawn with too.

import { useEffect, useState } from "react";
import type { BookCategory } from "@/lib/bible/books";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { IndexEyebrow, IndexList, IndexRow } from "./IndexRows";

type Tab = "ot" | "nt";
const STORAGE_KEY = "purify:bible:lastTestament";

export function BibleTabs({
  ot,
  nt,
}: {
  ot: BookCategory[];
  nt: BookCategory[];
}) {
  const { t } = useTranslate();
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
        aria-label={t("ui.testament")}
        className="grid grid-cols-2 gap-1 rounded-full border border-paper/10 bg-paper/[0.03] p-1"
      >
        <TabButton active={tab === "ot"} onClick={() => pick("ot")}>
          {t("footer.oldTestament")}
        </TabButton>
        <TabButton active={tab === "nt"} onClick={() => pick("nt")}>
          {t("footer.newTestament")}
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
  const { t } = useTranslate();
  return (
    <section>
      <IndexEyebrow>
        {t(`bible.category.${cat.label.toLowerCase().replace(/ /g, "-")}`)}
      </IndexEyebrow>
      <IndexList>
        {cat.books.map((b, i) => (
          <IndexRow
            key={b.slug}
            first={i === 0}
            href={`/bible/${b.slug}/1`}
            left={t(`bible.books.${b.slug}`)}
            right={`${b.chapters} ${t("bible.chAbbrev")}`}
          />
        ))}
      </IndexList>
    </section>
  );
}
