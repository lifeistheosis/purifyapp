"use client";

// Prayer rule reader — morning / evening / future hours + akathists.
//
// Per-prayer "Mark prayed" toggle (today's set is in localStorage),
// shown as a simple "X of N prayed today" progress for the current
// session only — no streaks, no history grid. Each prayer also carries
// a bookmark star that writes a `kind: 'prayer'` row to localStorage
// (and to Supabase if the user is signed in, via the existing bookmarks
// sync bridge).

import { useMemo, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import {
  markRuleCompletedToday,
  readTodayDone,
  writeTodayDone,
  PRAYER_EVENT,
} from "@/lib/prayers/storage";
import {
  isBookmarked as isPrayerBookmarked,
  togglePrayerBookmark,
} from "@/lib/prayers/bookmarks";

export type Prayer = {
  id: string;
  title: string;
  instruction?: string;
  text: string;
  /** Optional MP3 path under /public, e.g. "/audio/prayers/morning/trisagion.mp3". */
  audio?: string;
  /** For akathists: the refrain spoken after this stanza. */
  refrain?: string;
};

export type Rule = {
  id: string;
  title: string;
  subtitle?: string;
  intro: string;
  estimatedMinutes: number;
  source: string;
  prayers: Prayer[];
  /** Optional refrain spoken after every odd-indexed stanza (akathist pattern). */
  refrain?: string;
  /** Kind of rule — controls headings and UI affordances. */
  kind?: "rule" | "akathist" | "hour" | "compline";
};

type Snap = { done: string[]; today: string };
const SERVER_SNAP: Snap = { done: [], today: "" };
const cache = new Map<string, { raw: string | null; today: string; val: Snap }>();

function readSnap(ruleId: string): Snap {
  if (typeof window === "undefined") return SERVER_SNAP;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(`purify.prayers.${ruleId}.today.${today}`);
  } catch {
    return SERVER_SNAP;
  }
  const c = cache.get(ruleId);
  if (c && c.raw === raw && c.today === today) return c.val;
  let done: string[] = readTodayDone(ruleId);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) done = parsed.filter((x) => typeof x === "string");
    } catch {
      /* ignore */
    }
  }
  const val: Snap = { done, today };
  cache.set(ruleId, { raw, today, val });
  return val;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PRAYER_EVENT, cb);
  window.addEventListener("purify:bookmark", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PRAYER_EVENT, cb);
    window.removeEventListener("purify:bookmark", cb);
    window.removeEventListener("storage", cb);
  };
}

export function PrayerRuleReader({ rule }: { rule: Rule }) {
  const snap = useSyncExternalStore(
    subscribe,
    () => readSnap(rule.id),
    () => SERVER_SNAP,
  );
  const done = useMemo(() => new Set(snap.done), [snap.done]);
  const hydrated = snap.today !== "";

  const total = rule.prayers.length;
  const completedCount = done.size;
  const progress = total > 0 ? completedCount / total : 0;
  const allDone = completedCount === total && total > 0;

  function persist(next: Set<string>) {
    if (typeof window === "undefined") return;
    writeTodayDone(rule.id, [...next]);
    cache.delete(rule.id);
    if (next.size === total && total > 0) {
      markRuleCompletedToday(rule.id);
    }
  }

  function toggle(id: string) {
    const next = new Set(done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persist(next);
  }

  function markAll() {
    persist(new Set(rule.prayers.map((p) => p.id)));
  }
  function reset() {
    persist(new Set());
  }

  return (
    <article className="mx-auto w-full max-w-[640px]">
      <header className="mb-12 md:mb-14">
        <p className="font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40 mb-5">
          {eyebrowFor(rule)}
        </p>
        <h1 className="font-serif text-title md:text-heading leading-[1.15] tracking-[-0.01em] text-paper">
          {rule.title}
        </h1>
        {rule.subtitle && (
          <p className="mt-4 font-serif italic text-detail text-paper/45">
            {rule.subtitle}
          </p>
        )}
        <div aria-hidden className="mt-7 h-px w-10 bg-gold/50" />
        {rule.intro && (
          <p className="mt-7 font-serif text-body text-paper/70 leading-[1.8]">
            {rule.intro}
          </p>
        )}
        <p className="mt-4 font-sans text-caption text-paper/35">
          About {rule.estimatedMinutes} min · {total}{" "}
          {total === 1 ? "prayer" : "prayers"}
        </p>
      </header>

      {/* Progress — today. A quiet line over a hairline, not a card. */}
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="font-sans text-detail text-paper/50">
          <span className="text-paper/85 tabular-nums">{completedCount}</span> of{" "}
          {total} prayed today
        </p>
        <div className="flex items-center gap-3 font-sans text-caption">
          <button
            type="button"
            onClick={markAll}
            disabled={!hydrated || allDone}
            className="text-paper/45 hover:text-paper transition-colors disabled:opacity-30 disabled:hover:text-paper/45"
          >
            Mark all
          </button>
          <span className="text-paper/20">·</span>
          <button
            type="button"
            onClick={reset}
            disabled={!hydrated || completedCount === 0}
            className="text-paper/45 hover:text-paper transition-colors disabled:opacity-30 disabled:hover:text-paper/45"
          >
            Reset
          </button>
        </div>
      </div>
      <div className="h-px w-full bg-paper/10 overflow-hidden">
        <div
          className="h-full bg-gold/70 transition-[width] duration-300 ease-out"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {/* Completion — a quiet doxology, no banner. */}
      {allDone && (
        <p className="mt-8 text-center font-serif italic text-detail text-gold/70">
          Glory to God. The rule is complete for today.
        </p>
      )}

      <div className="mt-2 border-t border-paper/10">
        {rule.prayers.map((p) => (
          <PrayerCard
            key={p.id}
            ruleId={rule.id}
            prayer={p}
            isDone={done.has(p.id)}
            onToggle={() => toggle(p.id)}
            hydrated={hydrated}
          />
        ))}
      </div>

      <footer className="mt-14">
        <p className="font-sans text-caption text-paper/30">
          Source: {rule.source}
        </p>
      </footer>
    </article>
  );
}

function eyebrowFor(rule: Rule): string {
  switch (rule.kind) {
    case "akathist":
      return "Prayer · Akathist";
    case "hour":
    case "compline":
      return "Prayer · the Hours";
    default:
      return "Prayer · Daily rule";
  }
}

// ── AudioRow ────────────────────────────────────────────────────────────────
// Minimal inline audio control. Uses the native <audio> element so the
// browser handles streaming, scrubbing, and accessibility for free. No
// vendor SDK, no autoplay, no analytics. If the file is missing (404)
// the row stays hidden via the onError handler.
function AudioRow({ src }: { src: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <p className="mt-4 font-serif italic text-detail text-paper/35">
        Audio recording not yet shipped for this prayer.
      </p>
    );
  }
  return (
    <div className="mt-5 border-t border-paper/10 pt-4">
      <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/40 mb-2">
        Sung / Chanted
      </p>
      <audio
        controls
        preload="none"
        src={src}
        onError={() => setErrored(true)}
        className="w-full h-8"
      >
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}

function PrayerCard({
  ruleId,
  prayer,
  isDone,
  onToggle,
  hydrated,
}: {
  ruleId: string;
  prayer: Prayer;
  isDone: boolean;
  onToggle: () => void;
  hydrated: boolean;
}) {
  const bookmarked = useSyncExternalStore(
    subscribe,
    () => isPrayerBookmarked(ruleId, prayer.id),
    () => false,
  );

  return (
    <details id={prayer.id} open className="group border-b border-paper/10">
      <summary className="cursor-pointer list-none py-4 flex items-center justify-between gap-3">
        <span
          className={cn(
            "font-serif text-title-sm leading-snug transition-colors",
            isDone ? "text-paper/40 line-through" : "text-paper/90",
          )}
        >
          {prayer.title}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePrayerBookmark(ruleId, prayer.id, prayer.title);
            }}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark this prayer"}
            title={bookmarked ? "Bookmarked" : "Bookmark"}
            className={cn(
              "text-ui transition-colors",
              bookmarked ? "text-gold/90" : "text-paper/30 hover:text-paper",
            )}
          >
            {bookmarked ? "★" : "☆"}
          </button>
          <span
            aria-hidden
            className="text-paper/30 text-eyebrow group-open:rotate-180 transition-transform duration-200"
          >
            ▾
          </span>
        </span>
      </summary>
      <div className="pb-7">
        {prayer.instruction && (
          <p className="font-serif italic text-detail text-paper/45 leading-[1.55] mb-4">
            {prayer.instruction}
          </p>
        )}
        {prayer.text && (
          <div className="font-serif text-body text-paper/85 leading-[1.85] whitespace-pre-line">
            {prayer.text}
          </div>
        )}
        {prayer.refrain && (
          <p className="mt-5 border-l border-gold/30 pl-4 font-serif italic text-body text-gold/80 leading-[1.6]">
            {prayer.refrain}
          </p>
        )}
        {prayer.audio && <AudioRow src={prayer.audio} />}
        <div className="mt-6">
          <button
            type="button"
            onClick={onToggle}
            disabled={!hydrated}
            aria-pressed={isDone}
            className={cn(
              "inline-flex items-center gap-2 font-sans text-detail transition-colors",
              isDone
                ? "text-gold/80 hover:text-paper"
                : "text-paper/50 hover:text-paper",
            )}
          >
            <span aria-hidden className="text-caption">
              {isDone ? "✓" : "○"}
            </span>
            {isDone ? "Prayed today" : "Mark prayed"}
          </button>
        </div>
      </div>
    </details>
  );
}
