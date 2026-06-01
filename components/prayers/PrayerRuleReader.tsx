"use client";

// Prayer rule reader — morning / evening / future hours + akathists.
//
// Per-prayer "Mark prayed" toggle (today's set is in localStorage). When
// the whole rule is marked done, the date is appended to the rolling
// dates[] array — no streak integer. The RhythmStrip below shows the
// last 14 days as dots. Each prayer also carries a bookmark star that
// writes a `kind: 'prayer'` row to localStorage (and to Supabase if
// the user is signed in, via the existing bookmarks sync bridge).

import { useMemo, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { RhythmStrip } from "./RhythmStrip";
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
    <article className="mx-auto max-w-[760px] w-full">
      <header className="mb-8">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
          Daily prayer
        </p>
        <h1 className="font-sans text-display-sm md:text-display font-bold text-paper leading-[1.05] tracking-[-0.02em]">
          {rule.title}
        </h1>
        {rule.subtitle && (
          <p className="mt-3 font-serif italic text-body text-paper/65">
            {rule.subtitle}
          </p>
        )}
        <p className="mt-5 font-serif text-body text-paper/80 leading-[1.65]">
          {rule.intro}
        </p>
        <p className="mt-3 font-sans text-caption text-paper/45">
          About {rule.estimatedMinutes} minutes
        </p>
      </header>

      {/* Progress strip — today */}
      <div className="mb-4 rounded-md border border-paper/12 bg-paper/[0.03] p-4">
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <p className="font-sans text-detail text-paper/75">
            <span className="font-semibold text-paper">{completedCount}</span>
            <span className="text-paper/55"> of {total} prayed today</span>
          </p>
          <div className="flex items-center gap-3 text-caption font-sans">
            <button
              type="button"
              onClick={markAll}
              disabled={!hydrated || allDone}
              className="text-paper/60 hover:text-paper transition-colors disabled:opacity-40 disabled:hover:text-paper/60"
            >
              Mark all
            </button>
            <span className="text-paper/25">·</span>
            <button
              type="button"
              onClick={reset}
              disabled={!hydrated || completedCount === 0}
              className="text-paper/60 hover:text-paper transition-colors disabled:opacity-40 disabled:hover:text-paper/60"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="h-[3px] rounded-full bg-paper/8 overflow-hidden">
          <div
            className="h-full bg-gold transition-[width] duration-300 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Rhythm strip — 14-day pattern */}
      <div className="mb-6 rounded-md border border-paper/12 bg-paper/[0.03] p-4">
        <RhythmStrip ruleId={rule.id} />
      </div>

      {/* Completion banner */}
      {allDone && (
        <div className="mb-6 rounded-md border border-gold/40 bg-gold/[0.08] p-4 text-center">
          <p className="font-serif text-body text-paper">
            Glory to God. Rule complete for today.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
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

      <footer className="mt-12 pt-6 border-t border-paper/10">
        <p className="font-sans text-caption text-paper/40">
          Source: {rule.source}
        </p>
      </footer>
    </article>
  );
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
      <p className="mt-3 font-sans text-eyebrow text-paper/40 italic">
        Audio recording not yet shipped for this prayer.
      </p>
    );
  }
  return (
    <div className="mt-4 rounded-md border border-paper/10 bg-paper/[0.03] p-3">
      <p className="font-sans text-eyebrow uppercase tracking-[1.2px] text-paper/45 mb-2">
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
    <details
      id={prayer.id}
      open
      className={cn(
        "group rounded-md border transition-colors",
        isDone
          ? "border-emerald-500/30 bg-emerald-500/[0.04]"
          : "border-paper/12 bg-paper/[0.03] open:bg-paper/[0.05]",
      )}
    >
      <summary className="cursor-pointer list-none px-5 py-3.5 flex items-center justify-between gap-3">
        <span
          className={cn(
            "font-sans text-ui font-semibold leading-tight transition-colors",
            isDone ? "text-paper/55 line-through" : "text-paper",
          )}
        >
          {prayer.title}
        </span>
        <span className="flex items-center gap-2">
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
              "text-ui transition-colors px-1.5",
              bookmarked ? "text-gold" : "text-paper/35 hover:text-paper",
            )}
          >
            {bookmarked ? "★" : "☆"}
          </button>
          <span
            aria-hidden
            className="text-paper/35 text-eyebrow group-open:rotate-180 transition-transform duration-200"
          >
            ▾
          </span>
        </span>
      </summary>
      <div className="px-5 pb-5 -mt-1">
        {prayer.instruction && (
          <p className="font-sans italic text-detail text-paper/55 leading-[1.55] mb-3">
            {prayer.instruction}
          </p>
        )}
        {prayer.text && (
          <div className="font-serif text-body md:text-lede text-paper/90 leading-[1.7] whitespace-pre-line">
            {prayer.text}
          </div>
        )}
        {prayer.refrain && (
          <p className="mt-4 font-serif italic text-body text-gold/85 leading-[1.55] border-l-2 border-gold/30 pl-3">
            {prayer.refrain}
          </p>
        )}
        {prayer.audio && <AudioRow src={prayer.audio} />}
        <div className="mt-5">
          <button
            type="button"
            onClick={onToggle}
            disabled={!hydrated}
            aria-pressed={isDone}
            className={cn(
              "inline-flex items-center gap-2 rounded-pill border h-[36px] px-4 font-sans text-detail font-medium transition-colors",
              isDone
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                : "border-paper/15 bg-paper/[0.04] text-paper/85 hover:bg-paper/10 hover:border-paper/30",
            )}
          >
            <span aria-hidden>{isDone ? "✓" : "○"}</span>
            {isDone ? "Prayed" : "Mark prayed"}
          </button>
        </div>
      </div>
    </details>
  );
}
