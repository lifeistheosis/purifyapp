"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useBookmarks, type Bookmark } from "@/lib/bookmarks";
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
      <p className="mt-2 font-sans text-caption text-paper/35 italic">
        {t("study.saved.couldntLoad")}
      </p>
    );
  }
  if (text === null) {
    return (
      <p className="mt-2 font-sans text-caption text-paper/35 italic">
        {t("common.loading")}
      </p>
    );
  }
  return (
    <p className="mt-2 font-serif text-detail text-paper/75 leading-[1.6]">
      {text}
    </p>
  );
}
import { useReadingHistory, clearReadingHistory } from "@/lib/reading/history";
import { useRecentPrayers, clearRecentPrayers } from "@/lib/prayers/storage";
import { useTranslate } from "@/components/i18n/MessagesProvider";

type Tab = "saved" | "history";

/**
 * The /saved surface. A segmented Saved / History system:
 *   - Saved   → everything bookmarked, grouped by kind (verses, chapters,
 *               saint writings, prayers).
 *   - History → an auto-tracked timeline of what's been read and prayed,
 *               grouped by day with the time of each visit.
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
    <div className="mt-10">
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
  return (
    <div
      role="tablist"
      aria-label="Saved and history"
      className="inline-flex items-center gap-1 rounded-pill border border-paper/12 bg-paper/[0.03] p-1"
    >
      <SegButton
        active={tab === "saved"}
        onClick={() => onChange("saved")}
        label="Saved"
        count={savedCount}
      />
      <SegButton
        active={tab === "history"}
        onClick={() => onChange("history")}
        label="History"
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
      className={`inline-flex items-center gap-2 rounded-pill px-4 py-1.5 font-sans text-detail font-medium transition-colors ${
        active
          ? "bg-paper/10 text-paper"
          : "text-paper/55 hover:text-paper/85"
      }`}
    >
      {label}
      <span
        className={`tabular-nums text-caption ${
          active ? "text-paper/55" : "text-paper/35"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ── Saved tab ─────────────────────────────────────────────────────────── */

function SavedTab({
  bookmarks,
  onRemove,
}: {
  bookmarks: Bookmark[];
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslate();
  const [showVerseText, setShowVerseText] = useState(false);

  const verses = bookmarks.filter((b) => b.kind === "bible-verse");
  const chapters = bookmarks.filter((b) => b.kind === "bible-chapter");
  const writings = bookmarks.filter((b) => b.kind === "writing-section");
  const prayers = bookmarks.filter(
    (b) => b.kind === "prayer" || b.kind === "prayer-rule",
  );
  const products = bookmarks.filter((b) => b.kind === "product");

  if (bookmarks.length === 0) {
    return (
      <div className="rounded-lg border border-paper/10 bg-paper/[0.02] p-8 md:p-10">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/45 mb-3">
          {t("study.nothingSavedYet")}
        </p>
        <p className="font-serif text-lede text-paper/80 leading-[1.65] max-w-[560px]">
          {t("study.openABibleChapterAnd")}
        </p>
        <p className="mt-4 font-sans text-detail text-paper/55 leading-[1.55]">
          {t("study.bookmarksLiveInYourBrowser")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {verses.length > 0 && (
        <Group
          title="Verses"
          count={verses.length}
          action={
            <button
              type="button"
              onClick={() => setShowVerseText((v) => !v)}
              aria-pressed={showVerseText}
              className="font-sans text-caption text-paper/45 hover:text-paper transition-colors"
            >
              {showVerseText ? "Hide text" : "Show text"}
            </button>
          }
        >
          {verses.map((b) => (
            <Row
              key={b.id}
              bookmark={b}
              onRemove={() => onRemove(b.id)}
              showText={showVerseText}
            />
          ))}
        </Group>
      )}
      {chapters.length > 0 && (
        <Group title="Chapters" count={chapters.length}>
          {chapters.map((b) => (
            <Row key={b.id} bookmark={b} onRemove={() => onRemove(b.id)} />
          ))}
        </Group>
      )}
      {writings.length > 0 && (
        <Group title="Saint writings" count={writings.length}>
          {writings.map((b) => (
            <Row key={b.id} bookmark={b} onRemove={() => onRemove(b.id)} />
          ))}
        </Group>
      )}
      {prayers.length > 0 && (
        <Group title="Prayers" count={prayers.length}>
          {prayers.map((b) => (
            <Row key={b.id} bookmark={b} onRemove={() => onRemove(b.id)} />
          ))}
        </Group>
      )}
      {products.length > 0 && (
        <Group title="Saved icons" count={products.length}>
          {products.map((b) => (
            <Row key={b.id} bookmark={b} onRemove={() => onRemove(b.id)} />
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55">
          {title}
        </p>
        <div className="flex items-baseline gap-4">
          {action}
          <p className="font-sans text-caption text-paper/40 tabular-nums">
            {count}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-paper/8 border border-paper/12 rounded-md overflow-hidden">
        {children}
      </ul>
    </section>
  );
}

function hrefFor(b: Bookmark): string {
  switch (b.kind) {
    case "bible-verse":
      return `/bible/${b.book}/${b.chapter}#v${b.verse}`;
    case "bible-chapter":
      return `/bible/${b.book}/${b.chapter}`;
    case "writing-section":
      return `/saints/${b.saintSlug}/${b.workSlug}#s${b.sectionN}`;
    case "prayer":
      return `/prayers/${b.ruleId}#${b.prayerId}`;
    case "prayer-rule":
      return b.href;
    case "history-event":
      return `/history/${b.eventSlug}`;
    case "product":
      return `/shop/icons/${b.productSlug}`;
    default:
      return "/saved";
  }
}

function titleFor(b: Bookmark): string {
  if (b.kind === "writing-section") return b.sectionTitle;
  return b.label;
}

function subFor(b: Bookmark): string {
  switch (b.kind) {
    case "writing-section":
      return `${b.saintName} · ${b.workTitle}`;
    case "bible-verse":
      return "Verse";
    case "bible-chapter":
      return "Chapter";
    case "prayer":
      return "Prayer";
    case "prayer-rule":
      return "Prayer rule";
    case "history-event":
      return `History · ${b.displayDate}`;
    case "product":
      return `${b.storeName} · ${b.priceLabel} when saved`;
    default:
      return "";
  }
}

function dateLabel(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
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
  const { t } = useTranslate();
  return (
    <li className="px-5 py-4 bg-paper/[0.02] flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <Link href={hrefFor(bookmark)} className="block group">
          <p className="font-sans text-ui font-semibold text-paper group-hover:text-paper transition-colors truncate">
            {titleFor(bookmark)}
          </p>
          <p className="mt-1 font-sans text-caption text-paper/55 truncate">
            {subFor(bookmark)} {t("study.added")} {dateLabel(bookmark.addedAt)}
          </p>
        </Link>
        {showText && bookmark.kind === "bible-verse" && (
          <VerseText
            book={bookmark.book}
            chapter={bookmark.chapter}
            verse={bookmark.verse}
          />
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("study.saved.removeBookmark")}
        title={t("study.saved.removeBookmark")}
        className="shrink-0 h-9 w-9 rounded-full border border-paper/15 text-paper/55 hover:bg-crimson/20 hover:border-crimson/40 hover:text-crimson-soft flex items-center justify-center text-ui transition-colors duration-150"
      >
        ×
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

const HISTORY_KIND_LABEL: Record<string, string> = {
  work: "Writing",
  saint: "Saint",
  topic: "Topic",
  council: "Council",
  heresy: "Heresy",
  prayer: "Prayer",
};

function dayBucket(ms: number): string {
  const now = new Date();
  const d = new Date(ms);
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return dateLabel(ms);
}

function timeLabel(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString(undefined, {
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
  const { t } = useTranslate();
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
      <div className="rounded-lg border border-paper/10 bg-paper/[0.02] p-8 md:p-10">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/45 mb-3">
          {t("study.nothingReadYet")}
        </p>
        <p className="font-serif text-lede text-paper/80 leading-[1.65] max-w-[560px]">
          {t("study.openAVerseASaint")}
        </p>
      </div>
    );
  }

  // Group consecutive items by day bucket, preserving sort order.
  const groups: { bucket: string; items: HistoryItem[] }[] = [];
  for (const it of items) {
    const bucket = dayBucket(it.at);
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
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={onClear}
          className="font-sans text-caption text-paper/45 hover:text-crimson-soft transition-colors"
        >
          {t("study.clearHistory")}
        </button>
      </div>
      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.bucket}>
            <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
              {g.bucket}
            </p>
            <ul className="divide-y divide-paper/8 border border-paper/12 rounded-md overflow-hidden">
              {g.items.map((it) => (
                <li
                  key={it.key}
                  className="px-5 py-4 bg-paper/[0.02] flex items-center gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <Link href={it.href} className="block group">
                      <p className="font-sans text-ui font-semibold text-paper truncate">
                        {it.label}
                      </p>
                      <p className="mt-1 font-sans text-caption text-paper/55 truncate">
                        {HISTORY_KIND_LABEL[it.kind] ?? it.kind} ·{" "}
                        {timeLabel(it.at)}
                      </p>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
