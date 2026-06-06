"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useBookmarks, type Bookmark } from "@/lib/bookmarks";
import { useReadingHistory, clearReadingHistory } from "@/lib/reading/history";
import { useRecentPrayers, clearRecentPrayers } from "@/lib/prayers/storage";

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
  const verses = bookmarks.filter((b) => b.kind === "bible-verse");
  const chapters = bookmarks.filter((b) => b.kind === "bible-chapter");
  const writings = bookmarks.filter((b) => b.kind === "writing-section");
  const prayers = bookmarks.filter(
    (b) => b.kind === "prayer" || b.kind === "prayer-rule",
  );

  if (bookmarks.length === 0) {
    return (
      <div className="rounded-lg border border-paper/10 bg-paper/[0.02] p-8 md:p-10">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/45 mb-3">
          Nothing saved yet
        </p>
        <p className="font-serif text-lede text-paper/80 leading-[1.65] max-w-[560px]">
          Open a Bible chapter and tap the &#9734; on a verse, star a saint
          writing, or bookmark a prayer rule. What you keep lands here.
        </p>
        <p className="mt-4 font-sans text-detail text-paper/55 leading-[1.55]">
          Bookmarks live in your browser. When you sign in, your saved verses,
          chapters, and writings sync across devices.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {verses.length > 0 && (
        <Group title="Verses" count={verses.length}>
          {verses.map((b) => (
            <Row key={b.id} bookmark={b} onRemove={() => onRemove(b.id)} />
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
    </div>
  );
}

function Group({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55">
          {title}
        </p>
        <p className="font-sans text-caption text-paper/40 tabular-nums">
          {count}
        </p>
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
}: {
  bookmark: Bookmark;
  onRemove: () => void;
}) {
  return (
    <li className="px-5 py-4 bg-paper/[0.02] flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <Link href={hrefFor(bookmark)} className="block group">
          <p className="font-sans text-ui font-semibold text-paper group-hover:text-paper transition-colors truncate">
            {titleFor(bookmark)}
          </p>
          <p className="mt-1 font-sans text-caption text-paper/55 truncate">
            {subFor(bookmark)} · added {dateLabel(bookmark.addedAt)}
          </p>
        </Link>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove bookmark"
        title="Remove bookmark"
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
          Nothing read yet
        </p>
        <p className="font-serif text-lede text-paper/80 leading-[1.65] max-w-[560px]">
          Open a verse, a saint&rsquo;s writing, or a prayer and it will appear
          here, newest first, so you can pick up where you left off.
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
          Clear history
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
