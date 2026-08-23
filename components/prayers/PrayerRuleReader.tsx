"use client";

// Prayer rule reader — morning / evening / future hours + akathists.
//
// Per-prayer "Mark prayed" toggle (today's set is in localStorage),
// marked per prayer, with no count and no fraction shown, for the current
// session only — no streaks, no history grid. Each prayer also carries
// a bookmark star that writes a `kind: 'prayer'` row to localStorage
// (and to Supabase if the user is signed in, via the existing bookmarks
// sync bridge).

import { useMemo, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { ShareButton } from "@/components/ui/ShareButton";
import {
  markRuleCompletedToday,
  readTodayDone,
  writeTodayDone,
  PRAYER_EVENT,
} from "@/lib/prayers/storage";
import {
  isBookmarked as isPrayerBookmarked,
  togglePrayerBookmark,
  isRuleBookmarked,
  toggleRuleBookmark,
} from "@/lib/prayers/bookmarks";
import type { Prayer, PrayerVariant, Rule } from "@/lib/prayers/types";
import { useTranslate } from "@/components/i18n/MessagesProvider";

// Re-exported for back-compat: morning/evening pages import these as types.
export type { Prayer, PrayerVariant, Rule } from "@/lib/prayers/types";

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

export function PrayerRuleReader({
  rule,
  ruleHref,
}: {
  rule: Rule;
  /** When set, the header shows a star to bookmark the whole rule. */
  ruleHref?: string;
}) {
  const { t, tn } = useTranslate();
  const snap = useSyncExternalStore(
    subscribe,
    () => readSnap(rule.id),
    () => SERVER_SNAP,
  );
  const done = useMemo(() => new Set(snap.done), [snap.done]);
  const hydrated = snap.today !== "";

  const ruleBookmarked = useSyncExternalStore(
    subscribe,
    () => (ruleHref ? isRuleBookmarked(rule.id) : false),
    () => false,
  );

  const total = rule.prayers.length;
  // Still computed, still never rendered as a figure. `completedCount` only
  // decides whether "reset" is available, and `allDone` only decides whether
  // the closing line shows. Neither reaches the screen as a number.
  const completedCount = done.size;
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
        <p className="font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/55 mb-5">
          {eyebrowFor(rule)}
        </p>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-title md:text-heading leading-[1.15] tracking-[-0.01em] text-paper">
            {rule.title}
          </h1>
          <div className="mt-1 flex shrink-0 items-center gap-3">
            <ShareButton title={rule.title} />
            {ruleHref && (
              <button
                type="button"
                onClick={() => toggleRuleBookmark(rule.id, rule.title, ruleHref)}
                aria-pressed={ruleBookmarked}
                aria-label={
                  ruleBookmarked ? "Remove rule bookmark" : "Bookmark this rule"
                }
                title={ruleBookmarked ? "Bookmarked" : "Bookmark this rule"}
                className={cn(
                  "shrink-0 text-title-sm transition-colors",
                  ruleBookmarked
                    ? "text-gold/90"
                    : "text-paper/55 hover:text-paper",
                )}
              >
                {ruleBookmarked ? "★" : "☆"}
              </button>
            )}
          </div>
        </div>
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
        <p className="mt-4 font-sans text-caption text-paper/55">
          {t("prayers.reader.aboutMin", { min: rule.estimatedMinutes })} ·{" "}
          {tn("prayers.reader.prayerCount", total)}
          {rule.jurisdiction ? ` · ${rule.jurisdiction}` : ""}
        </p>
      </header>

      {/* NO COUNT, NO FRACTION, NO BAR.
          This row used to read "n of m prayed today" over a progress bar. A
          completion percentage on a prayer rule is the thing Purify refuses:
          it turns a rule into a task list with a score, and it makes an
          unfinished rule look like a failed one. The checkmarks below still
          mark a place, because a place is not a score. What is gone is the
          number, the fraction and the bar that drew them.

          The two controls stay and now sit alone on the right. */}
      <div className="mb-2 flex items-center justify-end gap-4">
        <div className="flex items-center gap-3 font-sans text-caption">
          <button
            type="button"
            onClick={markAll}
            disabled={!hydrated || allDone}
            className="text-paper/45 hover:text-paper transition-colors disabled:opacity-30 disabled:hover:text-paper/45"
          >
            {t("prayers.reader.markAll")}
          </button>
          <span className="text-paper/20">·</span>
          <button
            type="button"
            onClick={reset}
            disabled={!hydrated || completedCount === 0}
            className="text-paper/45 hover:text-paper transition-colors disabled:opacity-30 disabled:hover:text-paper/45"
          >
            {t("prayers.rope.reset")}
          </button>
        </div>
      </div>

      {/* The doxology stays. It is not a score: it says the rule is finished,
          which is what the end of a rule is, and it says it once and quietly.
          Nothing counts up to it and nothing is lost by not reaching it. */}
      {allDone && (
        <p className="mt-8 text-center font-serif italic text-detail text-gold/70">
          {t("prayers.reader.complete")}
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
        <p className="font-sans text-caption text-paper/55">
          {t("prayers.reader.sourceLabel")} {rule.source}
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
  const { t } = useTranslate();
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <p className="mt-4 font-serif italic text-detail text-paper/35">
        {t("prayers.reader.audioNotShipped")}
      </p>
    );
  }
  return (
    <div className="mt-5 border-t border-paper/10 pt-4">
      <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/55 mb-2">
        {t("prayers.reader.sungChanted")}
      </p>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- chanted prayer audio, no speech track to caption */}
      <audio
        controls
        preload="none"
        src={src}
        onError={() => setErrored(true)}
        className="w-full h-8"
      >
        {t("prayers.reader.audioUnsupported")}
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
  const { t } = useTranslate();
  const bookmarked = useSyncExternalStore(
    subscribe,
    () => isPrayerBookmarked(ruleId, prayer.id),
    () => false,
  );

  const variants = prayer.variants ?? [];
  const hasVariants = variants.length > 0;
  const [variantIdx, setVariantIdx] = useState(0);
  const active: PrayerVariant | undefined = hasVariants
    ? variants[Math.min(variantIdx, variants.length - 1)]
    : undefined;

  // What the reader actually shows: the selected variant when present,
  // otherwise the prayer's single text. Variant wordings are never merged.
  const shownInstruction = active?.instruction ?? prayer.instruction;
  const shownText = active?.text ?? prayer.text;
  const shownRefrain = active?.refrain ?? prayer.refrain;

  return (
    <details
      id={prayer.id}
      open
      className="group relative border-b border-paper/10"
    >
      {/* The bookmark star lives OUTSIDE the summary (absolutely positioned
          over its row): a button nested inside <summary> is a nested
          interactive control and fails accessibility checks. */}
      <summary className="cursor-pointer list-none py-4 flex items-center justify-between gap-3">
        <span
          className={cn(
            "font-serif text-title-sm leading-snug transition-colors pr-8",
            isDone ? "text-paper/40 line-through" : "text-paper/90",
          )}
        >
          {prayer.title}
        </span>
        <span
          aria-hidden
          className="shrink-0 text-paper/30 text-eyebrow group-open:rotate-180 transition-transform duration-200"
        >
          ▾
        </span>
      </summary>
      <button
        type="button"
        onClick={() => togglePrayerBookmark(ruleId, prayer.id, prayer.title)}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark this prayer"}
        title={bookmarked ? "Bookmarked" : "Bookmark"}
        className={cn(
          "absolute right-[26px] top-[19px] text-ui transition-colors",
          bookmarked ? "text-gold/90" : "text-paper/55 hover:text-paper",
        )}
      >
        {bookmarked ? "★" : "☆"}
      </button>
      <div className="pb-7">
        {hasVariants && (
          <div
            role="tablist"
            aria-label={t("prayers.reader.jurisdictionWordings")}
            className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-paper/10 pb-3"
          >
            {variants.map((v, i) => {
              const selected = i === Math.min(variantIdx, variants.length - 1);
              return (
                <button
                  key={v.jurisdiction}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setVariantIdx(i)}
                  className={cn(
                    "font-sans text-detail transition-colors",
                    selected
                      ? "text-gold/90"
                      : "text-paper/40 hover:text-paper/70",
                  )}
                >
                  {v.jurisdiction}
                </button>
              );
            })}
          </div>
        )}
        {shownInstruction && (
          <p className="font-serif italic text-detail text-paper/45 leading-[1.55] mb-4">
            {shownInstruction}
          </p>
        )}
        {shownText && (
          <div className="font-serif text-body text-paper/85 leading-[1.85] whitespace-pre-line">
            {shownText}
          </div>
        )}
        {shownRefrain && (
          <p className="mt-5 border-l border-gold/30 pl-4 font-serif italic text-body text-gold/80 leading-[1.6]">
            {shownRefrain}
          </p>
        )}
        {active && (
          <p className="mt-4 font-sans text-caption text-paper/55">
            {active.jurisdiction} · {active.source}
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
