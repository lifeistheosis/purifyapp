"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { KindIcon, savedSource, savedTitle, shortDate } from "@/components/saved/kinds";
import { CARD, CARD_BG, Eyebrow, ICON_TILE, ICON_TILE_SM } from "@/components/ui/Graphite";
import { Bookmark as BookmarkIcon } from "@/components/ui/icons/Bookmark";
import { Church } from "@/components/ui/icons/Church";
import { Close } from "@/components/ui/icons/Close";
import { Halo } from "@/components/ui/icons/Halo";
import { Hands } from "@/components/ui/icons/Hands";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Quill } from "@/components/ui/icons/Quill";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Shield } from "@/components/ui/icons/Shield";
import { bookmarkHref, useBookmarks, type Bookmark } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";
import { useRecentPrayers, clearRecentPrayers } from "@/lib/prayers/storage";
import { useReadingHistory, clearReadingHistory } from "@/lib/reading/history";
import { useMounted } from "@/lib/useMounted";

/* ── Verse text (lazy, on demand) ──────────────────────────────────────── */

// Cache fetched verse text for the session so toggling Show text on/off, or
// re-rendering, never refetches the same verse.
const verseTextCache = new Map<string, string>();

function verseCacheKey(book: string, chapter: number, verse: number) {
  return `${book}:${chapter}:${verse}`;
}

function VerseText({
  book,
  chapter,
  verse,
}: {
  book: string;
  chapter: number;
  verse: number;
}) {
  const { t } = useTranslate();
  const key = verseCacheKey(book, chapter, verse);
  const [text, setText] = useState<string | null>(
    () => verseTextCache.get(key) ?? null,
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    if (verseTextCache.has(key)) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- adopt the
         session-cached text synchronously when the verse key changes, instead
         of flashing "Loading…" and refetching. */
      setText(verseTextCache.get(key)!);
      return;
    }
    let alive = true;
    fetch(
      `/api/bible/verse?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad"))))
      .then((data: { verses?: { n: number; text: string }[] }) => {
        if (!alive) return;
        const t = data.verses?.[0]?.text?.trim() ?? "";
        verseTextCache.set(key, t);
        setText(t);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [key, book, chapter, verse]);

  if (error) {
    return (
      <p className="mt-2 font-sans text-caption italic text-paper/35">
        {t("study.saved.couldntLoad")}
      </p>
    );
  }
  if (text === null) {
    return (
      <p className="mt-2 font-sans text-caption italic text-paper/35">
        {t("common.loading")}
      </p>
    );
  }
  return (
    <p className="mt-2 border-l-2 border-paper/15 pl-3 font-serif text-detail leading-[1.6] text-paper/75">
      {text}
    </p>
  );
}

type Tab = "saved" | "history";

/**
 * The /saved surface. A segmented Saved / History system:
 *   - Saved   → everything bookmarked, grouped by kind (verses, chapters,
 *               saints, saint writings, prayers, history, icons), with a pill
 *               per kind to see one group alone.
 *   - History → an auto-tracked timeline of what's been read and prayed,
 *               grouped by day with the time of each visit.
 *
 * Redrawn 2026-09-28 in the graphite language of the Prayer and Discover
 * redesign: each group is one card, every row carries its kind's mark, and a
 * writing is listed under its own section title with the saint and the work
 * beneath (components/saved/kinds.tsx).
 */
export function SavedList() {
  const { bookmarks, remove } = useBookmarks();
  const readingHistory = useReadingHistory();
  const recentPrayers = useRecentPrayers();
  const [tab, setTab] = useState<Tab>("saved");

  // Mounted gate: the stores return empty server snapshots, so counts and
  // lists would otherwise flash from 0 on hydration.
  const mounted = useMounted();

  const historyCount = readingHistory.length + recentPrayers.length;

  return (
    <div className="mt-12">
      <Segmented
        tab={tab}
        onChange={setTab}
        savedCount={mounted ? bookmarks.length : 0}
        historyCount={mounted ? historyCount : 0}
      />
      <div className="mt-8">
        {!mounted ? null : tab === "saved" ? (
          <SavedTab bookmarks={bookmarks} onRemove={remove} />
        ) : (
          <HistoryTab reading={readingHistory} prayers={recentPrayers} />
        )}
      </div>
    </div>
  );
}

/* ── Segmented control ─────────────────────────────────────────────────── */

function Segmented({
  tab,
  onChange,
  savedCount,
  historyCount,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  savedCount: number;
  historyCount: number;
}) {
  const { t } = useTranslate();
  return (
    <div
      role="tablist"
      aria-label={t("study.saved.savedAndHistory")}
      className="inline-flex items-center gap-1 rounded-pill bg-paper/[0.05] p-1 ring-1 ring-inset ring-paper/10"
    >
      <SegButton
        active={tab === "saved"}
        onClick={() => onChange("saved")}
        label={t("common.saved")}
        count={savedCount}
      />
      <SegButton
        active={tab === "history"}
        onClick={() => onChange("history")}
        label={t("study.saved.history")}
        count={historyCount}
      />
    </div>
  );
}

function SegButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-pill px-5 font-sans text-detail font-semibold transition-colors",
        active ? "bg-paper text-night" : "text-paper/65 hover:text-paper",
      )}
    >
      {label}
      <span className={cn("tabular-nums text-caption font-medium", active ? "text-night/55" : "text-paper/40")}>
        {count}
      </span>
    </button>
  );
}

/* ── Saved tab ─────────────────────────────────────────────────────────── */

type GroupId = "verses" | "chapters" | "saints" | "writings" | "prayers" | "events" | "products";

const GROUPS: { id: GroupId; titleKey: string; kinds: Bookmark["kind"][] }[] = [
  { id: "verses", titleKey: "study.saved.verses", kinds: ["bible-verse"] },
  { id: "chapters", titleKey: "bible.chaptersLabel", kinds: ["bible-chapter"] },
  { id: "saints", titleKey: "study.saved.saints", kinds: ["saint"] },
  { id: "writings", titleKey: "study.saved.saintWritings", kinds: ["writing-section"] },
  { id: "prayers", titleKey: "nav.prayers", kinds: ["prayer", "prayer-rule"] },
  // Saved history events had no group, so they were stored and never shown:
  // BookmarkEventButton's own comment promised they "appear on /saved", and
  // a reader whose only bookmarks were events got a page that was neither
  // empty nor listed anything. Found 2026-09-25 while adding saints.
  { id: "events", titleKey: "study.saved.history", kinds: ["history-event"] },
  { id: "products", titleKey: "study.saved.savedIcons", kinds: ["product"] },
];

function SavedTab({
  bookmarks,
  onRemove,
}: {
  bookmarks: Bookmark[];
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslate();
  const [showVerseText, setShowVerseText] = useState(false);
  const [only, setOnly] = useState<GroupId | "all">("all");

  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: bookmarks
          .filter((b) => g.kinds.includes(b.kind))
          .sort((a, b) => b.addedAt - a.addedAt),
      })).filter((g) => g.items.length > 0),
    [bookmarks],
  );

  if (bookmarks.length === 0) {
    return (
      <div className={cn(CARD, "rounded-[22px] hover:translate-y-0 md:p-10")} style={CARD_BG}>
        <span aria-hidden className={ICON_TILE}>
          <BookmarkIcon size={22} />
        </span>
        <p className="mt-6 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
          {t("study.nothingSavedYet")}
        </p>
        <p className="mt-2 max-w-[560px] font-serif text-lede leading-[1.65] text-paper/80">
          {t("study.openABibleChapterAnd")}
        </p>
        <p className="mt-4 font-sans text-detail leading-[1.55] text-paper/55">
          {t("study.bookmarksLiveInYourBrowser")}
        </p>
      </div>
    );
  }

  // A group chosen and then emptied (its last row removed) shows everything
  // again rather than nothing.
  const shown = only === "all" ? groups : groups.filter((g) => g.id === only);
  const visible = shown.length > 0 ? shown : groups;

  return (
    <div>
      {groups.length > 1 && (
        <div className="no-scrollbar -mx-5 mb-8 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
          <FilterPill active={only === "all" || shown.length === 0} onClick={() => setOnly("all")} label={t("common.all")} count={bookmarks.length} />
          {groups.map((g) => (
            <FilterPill
              key={g.id}
              active={only === g.id}
              onClick={() => setOnly(g.id)}
              label={t(g.titleKey)}
              count={g.items.length}
            />
          ))}
        </div>
      )}
      {/* Two groups to a row on a large screen, so a handful of small
          groups is not a column of half-empty cards; one group alone (a pill
          chosen, or only one kind saved) takes the width and lays its rows
          out in two columns instead. */}
      <div className={cn("grid grid-cols-1 items-start gap-12", visible.length > 1 && "lg:grid-cols-2 lg:gap-x-6")}>
        {visible.map((g) => (
          <Group
            key={g.id}
            wide={visible.length === 1}
            title={t(g.titleKey)}
            count={g.items.length}
            action={
              g.id === "verses" ? (
                <button
                  type="button"
                  onClick={() => setShowVerseText((v) => !v)}
                  aria-pressed={showVerseText}
                  className="inline-flex min-h-11 items-center rounded-pill px-3.5 font-sans text-caption font-medium text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
                >
                  {showVerseText ? t("study.saved.hideText") : t("study.saved.showText")}
                </button>
              ) : null
            }
          >
            {g.items.map((b) => (
              <Row
                key={b.id}
                bookmark={b}
                onRemove={() => onRemove(b.id)}
                showText={g.id === "verses" && showVerseText}
              />
            ))}
          </Group>
        ))}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border px-4 font-sans text-detail font-medium transition-colors",
        active
          ? "border-paper bg-paper text-night"
          : "border-paper/15 bg-paper/[0.04] text-paper/80 hover:border-paper/30 hover:bg-paper/10 hover:text-paper",
      )}
    >
      {label}
      <span className={cn("tabular-nums text-caption", active ? "text-night/55" : "text-paper/45")}>{count}</span>
    </button>
  );
}

/** A group: its eyebrow and count, then one graphite card of rows. `wide`
 *  when it has the page to itself: its rows then run in two columns on a
 *  large screen, so a long list is not one thin column. */
function Group({
  title,
  count,
  action,
  wide = false,
  children,
}: {
  title: string;
  count: number;
  action?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  // min-w-0: a grid item will not shrink below its longest line otherwise,
  // and one long writing title pushed every card off the side of a phone.
  return (
    <section className="min-w-0">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <Eyebrow level={2}>{title}</Eyebrow>
          <span className="font-sans text-caption tabular-nums text-paper/40">{count}</span>
        </div>
        {action}
      </div>
      <ul
        className={cn(
          CARD,
          "mt-4 gap-1 rounded-[22px] p-2 hover:translate-y-0 md:p-2",
          wide && "lg:grid lg:grid-cols-2 lg:gap-x-2",
        )}
        style={CARD_BG}
      >
        {children}
      </ul>
    </section>
  );
}

function Row({
  bookmark,
  onRemove,
  showText,
}: {
  bookmark: Bookmark;
  onRemove: () => void;
  showText?: boolean;
}) {
  const { t, locale } = useTranslate();
  const source = savedSource(bookmark);
  const meta = [source, shortDate(bookmark.addedAt, locale, true)].filter(Boolean).join(" · ");
  return (
    <li className="flex min-w-0 items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-paper/[0.04]">
      <span aria-hidden className={ICON_TILE_SM}>
        <KindIcon kind={bookmark.kind} />
      </span>
      <div className="min-w-0 flex-1 self-center">
        <Link href={bookmarkHref(bookmark)} className="block">
          <p className="truncate font-sans text-ui font-semibold text-paper">{savedTitle(bookmark)}</p>
          {meta ? <p className="mt-0.5 truncate font-sans text-caption text-paper/55">{meta}</p> : null}
        </Link>
        {showText && bookmark.kind === "bible-verse" && (
          <VerseText book={bookmark.book} chapter={bookmark.chapter} verse={bookmark.verse} />
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("study.saved.removeBookmark")}
        title={t("study.saved.removeBookmark")}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full text-paper/45 transition-colors duration-150 hover:bg-paper/10 hover:text-paper"
      >
        <Close size={16} />
      </button>
    </li>
  );
}

/* ── History tab ───────────────────────────────────────────────────────── */

type HistoryItem = {
  key: string;
  kind: string;
  href: string;
  label: string;
  at: number;
};

function HistoryIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "work":
      return <Quill size={20} />;
    case "saint":
      return <Halo size={20} />;
    case "topic":
      return <Scroll size={20} />;
    case "council":
      return <Church size={20} />;
    case "heresy":
      return <Shield size={20} />;
    case "prayer":
      return <Hands size={20} />;
    default:
      return <Hourglass size={20} />;
  }
}

/** "Today", "Yesterday", or the date, in the reader's own language. */
function dayBucket(ms: number, locale: string): string {
  const now = new Date();
  const d = new Date(ms);
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays <= 1) {
    try {
      const word = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(diffDays <= 0 ? 0 : -1, "day");
      return word.charAt(0).toLocaleUpperCase(locale) + word.slice(1);
    } catch {
      /* fall through to the date */
    }
  }
  return shortDate(ms, locale, true);
}

function timeLabel(ms: number, locale: string): string {
  try {
    return new Date(ms).toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function HistoryTab({
  reading,
  prayers,
}: {
  reading: ReturnType<typeof useReadingHistory>;
  prayers: ReturnType<typeof useRecentPrayers>;
}) {
  const { t, locale } = useTranslate();
  const items = useMemo<HistoryItem[]>(() => {
    const merged: HistoryItem[] = [
      ...reading.map((e) => ({
        key: `r:${e.href}`,
        kind: e.kind as string,
        href: e.href,
        label: e.label,
        at: e.at,
      })),
      ...prayers.map((p) => ({
        key: `p:${p.id}`,
        kind: "prayer",
        href: p.href,
        label: p.title,
        at: p.at,
      })),
    ];
    return merged.sort((a, b) => b.at - a.at);
  }, [reading, prayers]);

  if (items.length === 0) {
    return (
      <div className={cn(CARD, "rounded-[22px] hover:translate-y-0 md:p-10")} style={CARD_BG}>
        <span aria-hidden className={ICON_TILE}>
          <Hourglass size={22} />
        </span>
        <p className="mt-6 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
          {t("study.nothingReadYet")}
        </p>
        <p className="mt-2 max-w-[560px] font-serif text-lede leading-[1.65] text-paper/80">
          {t("study.openAVerseASaint")}
        </p>
      </div>
    );
  }

  // Group consecutive items by day bucket, preserving sort order.
  const groups: { bucket: string; items: HistoryItem[] }[] = [];
  for (const it of items) {
    const bucket = dayBucket(it.at, locale);
    const last = groups[groups.length - 1];
    if (last && last.bucket === bucket) last.items.push(it);
    else groups.push({ bucket, items: [it] });
  }

  function onClear() {
    clearReadingHistory();
    clearRecentPrayers();
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-11 items-center rounded-pill px-3.5 font-sans text-caption font-medium text-paper/55 transition-colors hover:bg-paper/10 hover:text-paper"
        >
          {t("study.clearHistory")}
        </button>
      </div>
      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.bucket}>
            <Eyebrow level={2}>{g.bucket}</Eyebrow>
            <ul
              className={cn(CARD, "mt-4 gap-1 rounded-[22px] p-2 hover:translate-y-0 md:p-2 lg:grid lg:grid-cols-2 lg:gap-x-2")}
              style={CARD_BG}
            >
              {g.items.map((it) => (
                <li key={it.key} className="min-w-0">
                  <Link
                    href={it.href}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-paper/[0.04]"
                  >
                    <span aria-hidden className={ICON_TILE_SM}>
                      <HistoryIcon kind={it.kind} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-ui font-semibold text-paper">{it.label}</span>
                    </span>
                    <span className="shrink-0 font-sans text-caption tabular-nums text-paper/50">
                      {timeLabel(it.at, locale)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
