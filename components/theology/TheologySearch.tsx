"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Church } from "@/components/ui/icons/Church";
import { Cross } from "@/components/ui/icons/Cross";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Search } from "@/components/ui/icons/Search";
import { Shield } from "@/components/ui/icons/Shield";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { useOverlayOpen } from "@/lib/ui/overlay";
import { THEOLOGY_SECTIONS, searchLibrary, type TheologySearchItem, type TheologySection } from "@/lib/theology/searchKinds";

/**
 * Search the library, in reach of the thumb (1.8, round 3 r3-04, part 3, C:
 * "A search pill floats above the tab bar on every Theology screen, in reach
 * of the thumb"). The owner's note 24 of build 80: "I don't like how search
 * the library is literally all the way at the bottom." It searches the
 * theology library, as the pill says: the doctrines, the questions, the
 * heresies and the apologetics, the Seven Councils and the Fathers the
 * doctrines quote (lib/theology/searchIndex.ts).
 *
 * The pill stands over the tab bar, the mini player and Today's readings bar
 * by their own heights (globals.css, .theology-search-pill), and steps aside
 * while a sheet is open. An empty block of its height ends the page, so the
 * last line of a page can always be scrolled clear of it.
 *
 * The pill opens a sheet: the field, and under it the kinds of the library
 * as rows, each with how many it holds, to browse one whole. Typing searches
 * them all at once, the results under each kind's name. The seven scope
 * pills the old field had are gone (the owner's note 21: no more scattered
 * pills); the kinds are rows now, and the results say which kind each is.
 *
 * The list is one file (app/theology-search.json), fetched the first time
 * the sheet opens, with a relative address so it works in the apps with no
 * signal.
 */

const KIND_KEY: Record<TheologySection, string> = {
  Doctrine: "study.doctrine",
  Topics: "discover.tile.topics",
  Heresies: "discover.tile.heresies",
  Apologetics: "discover.tile.apologetics",
  Councils: "nav.councils",
  Fathers: "bible.fathersTag",
};

const KIND_ICON: Record<TheologySection, ComponentType<SVGProps<SVGSVGElement> & { size?: number }>> = {
  Doctrine: Cross,
  Topics: Book,
  Heresies: Scroll,
  Apologetics: Shield,
  Councils: Church,
  Fathers: HaloedHead,
};

let cache: TheologySearchItem[] | null = null;
let inFlight: Promise<TheologySearchItem[]> | null = null;

function loadLibrary(): Promise<TheologySearchItem[]> {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;
  // Relative on purpose: the apps serve the export from https://localhost,
  // where this file is bundled, so it opens with no network.
  inFlight = fetch("/theology-search.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((items: TheologySearchItem[]) => {
      cache = Array.isArray(items) ? items : [];
      return cache;
    })
    .catch(() => {
      // A search with nothing in it still opens and still says it found nothing.
      cache = [];
      return cache;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function TheologySearch() {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const covered = useOverlayOpen();
  return (
    <>
      {/* Room at the foot of the page, so its last line scrolls clear of the pill. */}
      <div aria-hidden className="h-20" />
      <div
        data-theology-search=""
        aria-hidden={covered || undefined}
        className={cn(
          "theology-search-pill pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 motion-safe:transition-opacity motion-safe:duration-200",
          covered && "opacity-0",
        )}
      >
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          tabIndex={covered ? -1 : undefined}
          className={cn(
            "theology-search-button tap-press inline-flex h-[50px] max-w-full items-center gap-2.5 rounded-pill border border-paper/20 bg-night-soft ps-[18px] pe-[22px] font-sans text-[15px] font-semibold text-paper",
            covered ? "pointer-events-none" : "pointer-events-auto",
          )}
        >
          <Search size={19} className="shrink-0" />
          <span className="truncate">{t("study.theology.searchLibrary")}</span>
        </button>
      </div>
      {open ? <SearchSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function SearchSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslate();
  const [items, setItems] = useState<TheologySearchItem[] | null>(cache);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<TheologySection | null>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    void loadLibrary().then((loaded) => {
      if (live) setItems(loaded);
    });
    // The field takes the keyboard as the sheet opens.
    const id = window.setTimeout(() => field.current?.focus(), 60);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, []);

  const found = useMemo(() => searchLibrary(items ?? [], query, kind), [items, query, kind]);
  const counts = useMemo(() => {
    const out = new Map<TheologySection, number>();
    for (const it of items ?? []) out.set(it.section, (out.get(it.section) ?? 0) + 1);
    return out;
  }, [items]);
  const typing = query.trim().length > 0;

  return (
    <Sheet open onClose={onClose} title={t("study.theology.searchLibrary")} desktop fill>
      <div className="px-1 pb-4">
        <label className="theology-field flex h-[54px] items-center gap-2.5 rounded-[16px] border border-paper/[0.13] px-4">
          <Search size={20} className="shrink-0 text-paper/55" />
          <input
            ref={field}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("study.theology.searchPlaceholder")}
            aria-label={t("study.theology.searchAria")}
            // 16px: an iPhone zooms the page into a field set any smaller.
            className="min-w-0 flex-1 bg-transparent font-sans text-[16px] text-paper placeholder:text-paper/45 focus:outline-none"
          />
        </label>

        {kind ? (
          <button
            type="button"
            onClick={() => setKind(null)}
            aria-label={`${t("common.back")}: ${t(KIND_KEY[kind])}`}
            className="tap-press mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-pill pe-3 font-sans text-detail font-semibold text-paper/75 hover:text-paper"
          >
            <ChevronLeft size={16} className="rtl:-scale-x-100" />
            {t(KIND_KEY[kind])}
          </button>
        ) : null}

        {!typing && !kind ? (
          // The kinds, as rows: browse one whole.
          <ul className="theology-tray mt-4 overflow-hidden rounded-[18px] py-1">
            {THEOLOGY_SECTIONS.filter((s) => (counts.get(s) ?? 0) > 0).map((s) => {
              const Icon = KIND_ICON[s];
              return (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => setKind(s)}
                    className="theology-row mx-1.5 flex min-h-[52px] w-[calc(100%-0.75rem)] items-center gap-3 rounded-[14px] px-2 text-start"
                  >
                    <span className="theology-plate grid size-8 shrink-0 place-items-center rounded-[10px] text-paper/85">
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1 font-serif text-[15px] font-semibold text-paper/92">{t(KIND_KEY[s])}</span>
                    <span className="font-sans text-caption font-medium tabular-nums text-paper/52">{counts.get(s)}</span>
                    <ChevronRight size={14} className="shrink-0 text-paper/32 rtl:-scale-x-100" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Results items={found} query={query} grouped={!kind} onLeave={onClose} />
        )}
      </div>
    </Sheet>
  );
}

function Results({
  items,
  query,
  grouped,
  onLeave,
}: {
  items: TheologySearchItem[];
  query: string;
  grouped: boolean;
  onLeave: () => void;
}) {
  const { t } = useTranslate();
  if (items.length === 0) {
    return (
      <p role="status" className="mt-6 px-2 text-center font-serif italic text-ui leading-[1.55] text-paper/55">
        {query.trim() ? t("study.theology.noMatch", { query: query.trim() }) : null}
      </p>
    );
  }
  const groups = grouped
    ? THEOLOGY_SECTIONS.map((s) => ({ kind: s, items: items.filter((it) => it.section === s) })).filter((g) => g.items.length > 0)
    : [{ kind: null, items }];
  return (
    <div className="mt-3">
      {groups.map((g) => (
        <section key={g.kind ?? "all"} className="mt-2">
          {g.kind ? (
            <h3 className="flex items-baseline justify-between px-2 pb-1 pt-2 font-sans text-[10.5px] font-bold uppercase tracking-[0.12em] text-paper/50">
              {t(KIND_KEY[g.kind])}
              <span className="text-[11.5px] font-semibold normal-case tracking-normal tabular-nums text-paper/40">{g.items.length}</span>
            </h3>
          ) : null}
          <ul>
            {g.items.map((it) => (
              <li key={it.href}>
                <Link href={it.href} onClick={onLeave} className="theology-row flex items-start gap-3 rounded-[14px] px-2 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-[15px] font-semibold leading-[1.25] text-paper/92">{it.title}</span>
                    {it.summary ? (
                      <span className="mt-1 line-clamp-2 block font-sans text-caption leading-[1.4] text-paper/55">{it.summary}</span>
                    ) : null}
                  </span>
                  <ChevronRight size={14} className="mt-1 shrink-0 text-paper/32 rtl:-scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
