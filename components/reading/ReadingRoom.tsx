"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { preload } from "react-dom";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Close } from "@/components/ui/icons/Close";
import { Search } from "@/components/ui/icons/Search";
import { cn } from "@/lib/cn";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday } from "@/lib/calendar/useToday";
import { avifFor } from "@/lib/media/streamed";
import { useSpace } from "@/lib/onboarding/useSpace";
import { ERA_IDS, LENGTH_IDS, THEME_IDS, TRADITION_IDS, partKey, themeKey, traditionKey } from "@/lib/reading/catalog";
import { useReadingHistory } from "@/lib/reading/history";
import { useReadingProgress } from "@/lib/reading/progress";
import { readingSeason } from "@/lib/reading/seasons";
import {
  beginRow,
  featuredFor,
  moreLikeThis,
  seasonRow,
  shortRow,
  themeRow,
  traditionRows,
  type Card,
  type Filters,
  type Room,
  type ThemePick,
  cardHref,
} from "@/lib/reading/select";
import { useMounted } from "@/lib/useMounted";

import { CoverRow, CoverTile, cardMeta, readingTime } from "./CoverRow";
import { FeaturedWork } from "./FeaturedWork";
import { FeelingsRow } from "./FeelingsRow";
import { ReadingSearch } from "./ReadingSearch";

export type LibraryLink = { href: string; labelKey: string; blurbKey: string };

const KEYS = ["q", "theme", "author", "era", "length", "tradition"] as const;

/** The filters a URL names, the unknown ones left out. */
function filtersOf(params: URLSearchParams): Filters {
  const pick = <T extends string>(name: string, allowed: readonly T[]) => {
    const v = params.get(name);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
  };
  const f: Filters = {
    theme: pick("theme", THEME_IDS),
    tradition: pick("tradition", TRADITION_IDS),
    era: pick("era", ERA_IDS),
    length: pick("length", LENGTH_IDS),
    author: params.get("author") || undefined,
  };
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as Filters;
}

/** The search's address. An open search with nothing in it yet keeps an empty q, so it is still the search. */
function urlOf(query: string, filters: Filters): string {
  const p = new URLSearchParams();
  if (query || Object.keys(filters).length === 0) p.set("q", query);
  for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
  const s = p.toString();
  return `${window.location.pathname}${s ? `?${s}` : ""}`;
}

/**
 * The address and the room, kept together. It reads the address inside a
 * Suspense of its own (an exported page cannot read it while it is written),
 * so the room itself is written into the page and the search follows the
 * moment the page wakes, before it is painted.
 */
function AddressSync({ onAddress }: { onAddress: (search: string) => void }) {
  const params = useSearchParams();
  const search = params.toString();
  useLayoutEffect(() => onAddress(search), [search, onAddress]);
  return null;
}

/** The covers a phone shows of a row before any swipe: three, and the edge of a fourth. */
const FIRST_SEEN = 4;

/**
 * A cover's picture, asked for while the room is still being drawn and before
 * its covers are in the page, the way the cover will ask for it (its AVIF
 * where it has one, components/covers/WorkCover.tsx), so the first pictures
 * are on their way as the room opens (1.8, the owner's note 13 of build 80).
 * React puts each in the page's head once; a page written ahead (the website,
 * the apps' export) carries the first row's in its own head, ahead of the
 * covers themselves. `first` is the day's book, asked for before the rest.
 */
function warm(cover: Card["cover"], first = false) {
  if (!cover) return;
  const avif = avifFor(cover.src);
  preload(avif ?? cover.src, { as: "image", ...(avif ? { type: "image/avif" } : {}), ...(first ? { fetchPriority: "high" as const } : {}) });
}

/**
 * The reading room (1.7, the owner's note 18: "a Netflix for books"). One
 * screen at every width: on a phone and in the apps the tab bar's name, then
 * the search field, the book for today on its stage, and rows of covers to
 * swipe. Tapping the field turns the room into its search, in place
 * (components/reading/ReadingSearch.tsx).
 *
 * THE ORDER OF THE ROWS (1.8, the owner's note of 2026-10-17: "I want short
 * reads at the top. If they're new to Orthodoxy, you put new to Orthodoxy at
 * the top also"). Short reads first. For a reader who told the onboarding
 * they are completely new or still learning (the question how familiar they
 * are with Orthodox Christianity, kept as `purify:level`, lib/onboarding/
 * state.ts), New to Orthodoxy comes first and Short reads under it: the same
 * readers the rest of the app treats as beginners (lib/onboarding/space.ts,
 * dayOneFor). Then what the reader is in the middle of and more like the last
 * book, the row by feeling with its Purify collections
 * (components/reading/FeelingsRow.tsx), daily life, New to Orthodoxy for
 * everyone else, the passions and the virtues (each the one best reading of
 * its theme, in the Fathers' own words), the season of the Church's year, a
 * row for each tradition, and the rest of the library.
 *
 * As the room scrolls, the day's book recedes and each row settles into place
 * as it comes up the screen, the scroll driving both, with the app's motion
 * switch on (components/reading/room.module.css).
 *
 * Every word is the reader's language (no server string, the apps' export
 * would freeze it in English). What depends on the reader (the day, the
 * history, the progress, the answer about how new they are) is worked out on
 * the device after the page wakes.
 */
export function ReadingRoom({ room, library }: { room: Room; library: LibraryLink[] }) {
  const { t } = useTranslate();
  const mounted = useMounted();
  const today = useToday();
  const [style] = useCalendarStyleDefault();
  const history = useReadingHistory();
  const progress = useReadingProgress();
  // New to Orthodoxy leads for a beginner: "Completely new" or "Learning".
  const { level } = useSpace();
  const beginner = level === "inquirer" || level === "learning";

  // The search: its words, its filters, and whether it is open.
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [open, setOpen] = useState(false);
  const pushed = useRef(false);
  const written = useRef<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const onAddress = useCallback((search: string) => {
    // The address this room wrote itself: nothing to read back.
    if (written.current !== null && search === written.current) return;
    const params = new URLSearchParams(search);
    const any = KEYS.some((k) => params.has(k));
    setQuery(params.get("q") ?? "");
    setFilters(filtersOf(params));
    setOpen(any);
    if (!any) pushed.current = false;
  }, []);

  const write = useCallback((nextQuery: string, nextFilters: Filters, how: "push" | "replace") => {
    const url = urlOf(nextQuery, nextFilters);
    written.current = new URL(url, window.location.origin).searchParams.toString();
    if (how === "push") window.history.pushState(window.history.state, "", url);
    else window.history.replaceState(window.history.state, "", url);
  }, []);

  const openSearch = () => {
    if (open) return;
    setOpen(true);
    pushed.current = true;
    write(query, filters, "push");
  };

  // Typing writes the address a moment after the last key, not on every one.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => write(query, filters, "replace"), 250);
    return () => clearTimeout(timer);
  }, [open, query, filters, write]);

  const onFilter = (which: keyof Filters, value: string | undefined) => {
    setFilters((cur) => {
      const next = { ...cur, [which]: value } as Filters;
      if (value === undefined) delete next[which];
      return next;
    });
  };

  const close = () => {
    setQuery("");
    setFilters({});
    setOpen(false);
    input.current?.blur();
    if (pushed.current) {
      pushed.current = false;
      written.current = null;
      window.history.back();
    } else {
      written.current = "";
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  };

  // The book at the top, for the reader's own day and calendar.
  const featured = useMemo(() => (today ? featuredFor(room, today, style) : null), [room, today, style]);
  const featuredCard = featured ? (room.cards.find((c) => c.key === featured.key) ?? null) : null;
  const featuredInfo = featured ? room.featured.find((f) => f.key === featured.key) : undefined;
  const season = useMemo(() => (today ? readingSeason(today, style) : null), [today, style]);

  const cards = useMemo(() => new Map(room.cards.map((c) => [c.key, c])), [room.cards]);
  const keyOf = (href: string) => href.replace(/^\/saints\//, "").replace(/\/$/, "");
  /** A work registered twice was read under either address. */
  const cardOf = (key: string): Card | undefined => cards.get(key) ?? (key === "anthony-the-great/life-of-antony" ? cards.get("athanasius-the-great/life-of-antony") : undefined);

  // What the reader is in the middle of: works opened, not finished, newest first.
  const continuing = useMemo(() => {
    if (!mounted) return [];
    const out: { card: Card; at?: number; of?: number; n?: number }[] = [];
    for (const e of history) {
      if (e.kind !== "work") continue;
      const key = keyOf(e.href);
      const card = cardOf(key);
      const p = progress[key];
      if (!card || p?.done || out.some((o) => o.card.key === card.key)) continue;
      out.push({ card, at: p?.i, of: p?.of, n: p?.n });
      if (out.length >= 10) break;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, history, progress, cards]);

  const lastRead = useMemo(() => {
    if (!mounted) return null;
    const last = history.find((e) => e.kind === "work");
    return last ? (cardOf(keyOf(last.href)) ?? null) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, history, cards]);
  const because = useMemo(() => (lastRead ? moreLikeThis(room, lastRead.key, 10) : []), [room, lastRead]);

  const begin = useMemo(() => beginRow(room), [room]);
  const passions = useMemo(() => themeRow(room, "passions"), [room]);
  const virtues = useMemo(() => themeRow(room, "virtues"), [room]);
  const life = useMemo(() => themeRow(room, "life"), [room]);
  const traditions = useMemo(() => traditionRows(room), [room]);
  const short = useMemo(() => shortRow(room), [room]);
  const seasonId = season ? (season.current ?? season.next) : null;
  const seasonal = useMemo(() => (seasonId ? seasonRow(room, seasonId) : []), [room, seasonId]);

  // The first pictures the room opens on, asked for now: the day's book, and
  // the first covers of the row under it. Each cover then waits for its own
  // in the page's colour and arrives whole (components/reading/CoverRow.tsx).
  if (!open) {
    warm(featuredCard?.cover, true);
    for (const c of (beginner ? begin : short).slice(0, FIRST_SEEN)) warm(c.cover);
  }

  const partLabel = (p: ThemePick) =>
    p.part ? t(partKey(p.part.kind, p.part.to !== undefined), { n: p.part.from, from: p.part.from, to: p.part.to ?? p.part.from }) : null;
  /**
   * A part of a work on a row. On the passions, the virtues and daily life it
   * is named by its theme, with the part and its minutes under it; on a
   * season's row by the part alone ("Homily 12"), the cover naming the book.
   */
  const pickTile = (p: ThemePick, by: "theme" | "part") => {
    const card = cards.get(p.key);
    if (!card) return null;
    const part = partLabel(p);
    const label = by === "theme" ? t(themeKey(p.theme)) : (part ?? undefined);
    const meta = [by === "theme" ? part : null, readingTime(p.minutes, t)].filter(Boolean).join(" · ");
    return <CoverTile key={`${p.theme}-${p.key}`} card={card} href={p.href} label={label} meta={meta} />;
  };

  const firstReads = (
    <CoverRow id="begin" title={t("reading.row.begin")} eager={beginner}>
      {begin.map((c) => (
        <CoverTile key={c.key} card={c} meta={cardMeta(c, t)} />
      ))}
    </CoverRow>
  );

  return (
    <div className="bg-night">
      {/* The tab bar's name and buttons, on a phone and in the apps. Not
          pinned: in the apps the back bar above it already is. */}
      <div className="md:hidden native-md-block">
        <MobileHeader titleKey="nav.reading" sticky={false} />
      </div>

      <section className="px-5 pb-16 pt-4 md:px-8 md:pt-12">
        <div className="mx-auto w-full max-w-[1100px]">
          <h1 className="hidden text-heading font-semibold leading-tight tracking-[-0.01em] text-paper md:block native-md-hidden">
            {t("nav.reading")}
          </h1>

          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              input.current?.blur();
            }}
            className="relative z-10 flex items-center gap-2 md:mt-5 md:max-w-[560px]"
          >
            <label className="relative flex h-11 min-w-0 flex-1 items-center rounded-pill border border-paper/12 bg-paper/[0.05] ps-4 pe-1 focus-within:border-paper/35">
              <Search size={18} className="shrink-0 text-paper/50" />
              <span className="sr-only">{t("reading.searchPlaceholder")}</span>
              <input
                ref={input}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onFocus={openSearch}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("reading.searchPlaceholder")}
                className="h-full min-w-0 flex-1 bg-transparent ps-2.5 font-sans text-ui text-paper placeholder:text-paper/45 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  aria-label={t("reading.search.clear")}
                  onClick={() => {
                    setQuery("");
                    input.current?.focus();
                  }}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-paper/55 hover:text-paper"
                >
                  <Close size={15} />
                </button>
              ) : null}
            </label>
            {open ? (
              <button type="button" onClick={close} className="tap-press hit-44 shrink-0 px-1 font-sans text-ui font-medium text-paper/75 hover:text-paper">
                {t("common.cancel")}
              </button>
            ) : null}
          </form>

          <Suspense fallback={null}>
            <AddressSync onAddress={onAddress} />
          </Suspense>

          {open ? (
            <ReadingSearch room={room} query={query} filters={filters} onFilter={onFilter} />
          ) : (
            <div data-reading-home="">
              <FeaturedWork card={featuredCard} blurb={featuredInfo?.blurb ?? ""} first={featuredInfo?.first ?? 1} feast={featured?.reason === "feast"} />

              {beginner ? firstReads : null}

              <CoverRow id="short" title={t("reading.row.short")} seeAll="?length=under20" eager>
                {short.map((c) => (
                  <CoverTile key={c.key} card={c} meta={cardMeta(c, t)} />
                ))}
              </CoverRow>

              {continuing.length ? (
                <CoverRow id="continue" title={t("reading.continue")} eager>
                  {continuing.map(({ card, at, of, n }) => (
                    <CoverTile
                      key={card.key}
                      card={card}
                      href={n !== undefined ? `${cardHref(card)}#s${n}` : cardHref(card)}
                      meta={at !== undefined && of ? t("saints.sectionOf", { n: at + 1, total: of }) : cardMeta(card, t)}
                      progress={at !== undefined && of ? (at + 1) / of : undefined}
                    />
                  ))}
                </CoverRow>
              ) : null}

              {lastRead && because.length ? (
                <CoverRow id="because" title={t("reading.row.because", { title: lastRead.title })}>
                  {because.map((c) => (
                    <CoverTile key={c.key} card={c} meta={cardMeta(c, t)} />
                  ))}
                </CoverRow>
              ) : null}

              <FeelingsRow doors={room.feelings} />

              <CoverRow id="life" title={t("reading.row.life")}>
                {life.map((p) => pickTile(p, "theme"))}
              </CoverRow>

              {beginner ? null : firstReads}

              <CoverRow id="passions" title={t("reading.row.passions")}>
                {passions.map((p) => pickTile(p, "theme"))}
              </CoverRow>
              <CoverRow id="virtues" title={t("reading.row.virtues")}>
                {virtues.map((p) => pickTile(p, "theme"))}
              </CoverRow>

              {seasonId && seasonal.length >= 3 ? (
                <CoverRow id="season" title={t(themeKey(seasonId))} seeAll={`?theme=${seasonId}`}>
                  {seasonal.map((p) => pickTile(p, "part"))}
                </CoverRow>
              ) : null}

              {traditions.map((row) => (
                <CoverRow
                  key={row.id}
                  id={`tradition-${row.id}`}
                  title={t(traditionKey(row.id))}
                  seeAll={row.total > row.cards.length ? `?tradition=${row.id}` : undefined}
                 
                >
                  {row.cards.map((c) => (
                    <CoverTile key={c.key} card={c} meta={cardMeta(c, t)} />
                  ))}
                </CoverRow>
              ))}

              <section aria-labelledby="row-library" className="mt-11">
                <h2 id="row-library" className="text-[19px] font-semibold leading-tight tracking-[-0.01em] text-paper md:text-title-sm">
                  {t("reading.row.alsoInLibrary")}
                </h2>
                <ul className="mt-2 divide-y divide-paper/8 md:grid md:grid-cols-2 md:gap-x-10 md:divide-y-0">
                  {library.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="press-card flex items-center gap-4 py-4">
                        <span className="min-w-0 flex-1">
                          <span className="block font-sans text-ui font-semibold text-paper">{t(l.labelKey)}</span>
                          <span className="mt-0.5 block font-sans text-detail leading-[1.5] text-paper/60">{t(l.blurbKey)}</span>
                        </span>
                        <ChevronRight size={16} className={cn("shrink-0 text-paper/40 rtl:-scale-x-100")} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
