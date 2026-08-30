"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  getBook,
  getOldTestamentCategories,
  getNewTestamentCategories,
  type BibleBook,
  type BookCategory,
} from "@/lib/bible/books";

type Testament = { labelKey: string; categories: BookCategory[] };

const TESTAMENTS: Testament[] = [
  { labelKey: "bible.oldTestamentShort", categories: getOldTestamentCategories() },
  { labelKey: "bible.newTestamentShort", categories: getNewTestamentCategories() },
];

export function BookSwitcher({ currentSlug }: { currentSlug: string }) {
  const { locale, t, tn } = useTranslate();
  const router = useRouter();
  const current = getBook(currentSlug);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the search input when the panel opens. (Query is reset in the
  // open toggle handler so no setState happens inside this effect.)
  useEffect(() => {
    if (!open) return;
    // microtask so the input is in the DOM
    queueMicrotask(() => inputRef.current?.focus());
  }, [open]);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return TESTAMENTS;
    return TESTAMENTS.map((tst) => ({
      labelKey: tst.labelKey,
      categories: tst.categories
        .map((c) => ({
          label: c.label,
          books: c.books.filter((b) => b.name.toLowerCase().includes(q) || t(`bible.books.${b.slug}`).toLowerCase().includes(q)),
        }))
        .filter((c) => c.books.length > 0),
    })).filter((tst) => tst.categories.length > 0);
  // t is a fresh closure each render; locale is the real staleness signal.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, locale]);

  function go(b: BibleBook) {
    setOpen(false);
    if (b.slug !== currentSlug) router.push(`/bible/${b.slug}/1`);
  }

  // Flatten visible books for Enter-to-select.
  const flat: BibleBook[] = filtered.flatMap((t) =>
    t.categories.flatMap((c) => c.books),
  );

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (flat.length > 0) go(flat[0]);
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          if (!open) setQuery("");
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] hover:border-paper/30 hover:bg-paper/10 focus:outline-none focus:ring-2 focus:ring-paper/25 pl-3 pr-2.5 py-2 font-sans text-detail font-medium text-paper transition-colors"
      >
        <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55">
          {t("bible.bookLabel")}
        </span>
        <span className="font-sans text-detail font-medium text-paper">
          {current ? t(`bible.books.${current.slug}`) : t("bible.select")}
        </span>
        <span
          aria-hidden
          className={cn(
            "text-eyebrow text-paper/55 transition-transform duration-200",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("bible.switchBook")}
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(380px,calc(100vw-2rem))] rounded-lg border border-paper/15 bg-night shadow-overlay overflow-hidden"
        >
          <div className="border-b border-paper/10 p-2">
            <div className="relative">
              <span
                aria-hidden
                className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/45 text-caption"
              >
                ⌕
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder={t("bible.searchBooksPlaceholder")}
                aria-label={t("bible.searchBooksAria")}
                className="w-full bg-paper/[0.04] border border-paper/10 rounded-md pl-8 pr-3 py-2 font-sans text-detail text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/25 focus:bg-paper/[0.06]"
              />
            </div>
          </div>

          <div
            role="listbox"
            aria-label={t("bible.booksAria")}
            className="max-h-[60vh] overflow-y-auto p-2"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center font-sans text-caption text-paper/45">
                {t("bible.noBooksMatchQuery", { query })}
              </p>
            ) : (
              filtered.map((grp) => (
                <div key={grp.labelKey} className="mb-1 last:mb-0">
                  <p className="px-2 pt-3 pb-1.5 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
                    {t(grp.labelKey)}
                  </p>
                  {grp.categories.map((c) => (
                    <div key={c.label} className="mb-1 last:mb-0">
                      <p className="px-2 pt-1.5 pb-1 font-sans text-eyebrow uppercase tracking-[1.1px] text-paper/35">
                        {t(`bible.category.${c.label.toLowerCase().replace(/ /g, "-")}`)}
                      </p>
                      <ul>
                        {c.books.map((b) => {
                          const isCurrent = b.slug === currentSlug;
                          return (
                            <li key={b.slug}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={isCurrent}
                                onClick={() => go(b)}
                                className={cn(
                                  "w-full flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left font-sans text-detail transition-colors",
                                  isCurrent
                                    ? "bg-accent/15 text-paper"
                                    : "text-paper/85 hover:bg-paper/[0.06] hover:text-paper",
                                )}
                              >
                                <span className="truncate">{t(`bible.books.${b.slug}`)}</span>
                                <span
                                  className={cn(
                                    "font-sans text-eyebrow tracking-[0.5px] shrink-0",
                                    isCurrent ? "text-paper/65" : "text-paper/35",
                                  )}
                                >
                                  {tn("bible.chAbbrevCount", b.chapters)}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-paper/10 px-3 py-2 flex items-center justify-between font-sans text-eyebrow text-paper/40">
            <span>{t("bible.enterToOpen")}</span>
            <span>{t("bible.escToClose")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
