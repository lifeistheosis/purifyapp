"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export type Prayer = {
  id: string;
  title: string;
  instruction?: string;
  text: string;
};

export type Rule = {
  id: string;
  title: string;
  subtitle?: string;
  intro: string;
  estimatedMinutes: number;
  source: string;
  prayers: Prayer[];
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function ymdMinusOne(ymd: string): string {
  const y = parseInt(ymd.slice(0, 4), 10);
  const m = parseInt(ymd.slice(4, 6), 10) - 1;
  const d = parseInt(ymd.slice(6, 8), 10);
  const dt = new Date(Date.UTC(y, m, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/**
 * A single Orthodox prayer rule presented prayer-by-prayer. Each prayer is
 * a `<details>` open by default. Each can be marked Done; state is stored
 * in localStorage keyed by `purify.prayers.{ruleId}.{yyyymmdd}` so that
 * "today's" progress persists across visits but resets at midnight.
 * Completing all prayers ticks the rule's streak counter
 * (purify.prayers.{ruleId}.streak).
 */
export function PrayerRuleReader({ rule }: { rule: Rule }) {
  const [hydrated, setHydrated] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [today, setToday] = useState<string>("");

  useEffect(() => {
    const k = todayKey();
    setToday(k);
    try {
      const raw = window.localStorage.getItem(
        `purify.prayers.${rule.id}.${k}`,
      );
      if (raw) setDone(new Set(JSON.parse(raw)));
      const s = window.localStorage.getItem(`purify.prayers.${rule.id}.streak`);
      if (s) setStreak(parseInt(s, 10) || 0);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [rule.id]);

  const total = rule.prayers.length;
  const completedCount = done.size;
  const progress = total > 0 ? completedCount / total : 0;
  const allDone = completedCount === total && total > 0;

  // When the rule flips from not-all-done to all-done, advance the streak.
  // Idempotent per day: only increments if today's date hasn't already been
  // counted (we track last-completed yyyymmdd alongside the streak).
  useEffect(() => {
    if (!hydrated || !allDone || !today) return;
    try {
      const lastKey = `purify.prayers.${rule.id}.last`;
      const last = window.localStorage.getItem(lastKey);
      if (last === today) return;
      const yesterday = ymdMinusOne(today);
      const newStreak = last === yesterday ? streak + 1 : 1;
      window.localStorage.setItem(lastKey, today);
      window.localStorage.setItem(
        `purify.prayers.${rule.id}.streak`,
        String(newStreak),
      );
      setStreak(newStreak);
    } catch {
      /* ignore */
    }
  }, [allDone, hydrated, rule.id, streak, today]);

  function persist(next: Set<string>) {
    setDone(new Set(next));
    try {
      window.localStorage.setItem(
        `purify.prayers.${rule.id}.${today}`,
        JSON.stringify([...next]),
      );
    } catch {
      /* ignore */
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
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
          Daily prayer
        </p>
        <h1 className="font-sans text-[36px] md:text-[48px] font-bold text-paper leading-[1.05] tracking-[-0.02em]">
          {rule.title}
        </h1>
        {rule.subtitle && (
          <p className="mt-3 font-serif italic text-[17px] text-paper/65">
            {rule.subtitle}
          </p>
        )}
        <p className="mt-5 font-serif text-[17px] text-paper/80 leading-[1.65]">
          {rule.intro}
        </p>
        <p className="mt-3 font-sans text-[12px] text-paper/45">
          About {rule.estimatedMinutes} minutes
        </p>
      </header>

      {/* Progress strip */}
      <div className="mb-6 rounded-md border border-paper/12 bg-paper/[0.03] p-4">
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <p className="font-sans text-[13px] text-paper/75">
            <span className="font-semibold text-paper">{completedCount}</span>
            <span className="text-paper/55"> of {total} prayed</span>
          </p>
          <div className="flex items-center gap-3 text-[12px] font-sans">
            {streak > 0 && (
              <span className="text-[#d4af37]">
                {streak} day{streak === 1 ? "" : "s"} in a row
              </span>
            )}
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
            className="h-full bg-[#d4af37] transition-[width] duration-300 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Completion banner */}
      {allDone && (
        <div className="mb-6 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/[0.08] p-4 text-center">
          <p className="font-serif text-[17px] text-paper">
            Glory to God. Rule complete for today.
          </p>
          {streak > 1 && (
            <p className="mt-1 font-sans text-[12px] text-[#d4af37]/85 uppercase tracking-[1.5px]">
              {streak} days in a row
            </p>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        {rule.prayers.map((p) => {
          const isDone = done.has(p.id);
          return (
            <details
              key={p.id}
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
                    "font-sans text-[15px] font-semibold leading-tight transition-colors",
                    isDone ? "text-paper/55 line-through" : "text-paper",
                  )}
                >
                  {p.title}
                </span>
                <span
                  aria-hidden
                  className="text-paper/35 text-[11px] group-open:rotate-180 transition-transform duration-200"
                >
                  ▾
                </span>
              </summary>
              <div className="px-5 pb-5 -mt-1">
                {p.instruction && (
                  <p className="font-sans italic text-[13px] text-paper/55 leading-[1.55] mb-3">
                    {p.instruction}
                  </p>
                )}
                {p.text && (
                  <div className="font-serif text-[17px] md:text-[18px] text-paper/90 leading-[1.7] whitespace-pre-line">
                    {p.text}
                  </div>
                )}
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    disabled={!hydrated}
                    aria-pressed={isDone}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-pill border h-[36px] px-4 font-sans text-[13px] font-medium transition-colors",
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
        })}
      </div>

      <footer className="mt-12 pt-6 border-t border-paper/10">
        <p className="font-sans text-[12px] text-paper/40">
          Source: {rule.source}
        </p>
      </footer>
    </article>
  );
}
