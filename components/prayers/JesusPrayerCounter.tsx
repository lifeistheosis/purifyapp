"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const PRESETS = [33, 50, 100, 150, 300];

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
 * Guided counter for the Jesus Prayer. Tap the counter to advance by one;
 * tap a preset to set a goal; toggle the breath cue to get a slow inhale/
 * exhale pulse. Today's total persists in localStorage and adds to a
 * day-streak when the user hits at least 33 counts in a calendar day.
 */
export function JesusPrayerCounter() {
  const [hydrated, setHydrated] = useState(false);
  const [count, setCount] = useState(0); // session count toward current goal
  const [todayTotal, setTodayTotal] = useState(0);
  const [goal, setGoal] = useState(100);
  const [breath, setBreath] = useState(false);
  const [streak, setStreak] = useState(0);
  const [today, setToday] = useState("");
  const streakedRef = useRef(false);

  useEffect(() => {
    const k = todayKey();
    setToday(k);
    try {
      const t = window.localStorage.getItem(`purify.prayers.jesus.${k}`);
      if (t) {
        const n = parseInt(t, 10) || 0;
        setTodayTotal(n);
        if (n >= 33) streakedRef.current = true;
      }
      const g = window.localStorage.getItem("purify.prayers.jesus.goal");
      if (g) setGoal(parseInt(g, 10) || 100);
      const s = window.localStorage.getItem("purify.prayers.jesus.streak");
      if (s) setStreak(parseInt(s, 10) || 0);
      const b = window.localStorage.getItem("purify.prayers.jesus.breath");
      if (b === "1") setBreath(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function bumpToday(newTotal: number) {
    setTodayTotal(newTotal);
    try {
      window.localStorage.setItem(
        `purify.prayers.jesus.${today}`,
        String(newTotal),
      );
    } catch {
      /* ignore */
    }
    // Streak fires once when today crosses 33.
    if (!streakedRef.current && newTotal >= 33) {
      streakedRef.current = true;
      try {
        const lastKey = "purify.prayers.jesus.last";
        const last = window.localStorage.getItem(lastKey);
        const yesterday = ymdMinusOne(today);
        const newStreak = last === yesterday ? streak + 1 : 1;
        window.localStorage.setItem(lastKey, today);
        window.localStorage.setItem(
          "purify.prayers.jesus.streak",
          String(newStreak),
        );
        setStreak(newStreak);
      } catch {
        /* ignore */
      }
    }
  }

  function advance() {
    const nextCount = count + 1;
    setCount(nextCount);
    bumpToday(todayTotal + 1);
  }

  function back() {
    if (count <= 0) return;
    setCount(count - 1);
    if (todayTotal > 0) bumpToday(todayTotal - 1);
  }

  function resetSession() {
    setCount(0);
  }

  function pickGoal(g: number) {
    setGoal(g);
    try {
      window.localStorage.setItem("purify.prayers.jesus.goal", String(g));
    } catch {
      /* ignore */
    }
  }

  function toggleBreath() {
    const next = !breath;
    setBreath(next);
    try {
      window.localStorage.setItem(
        "purify.prayers.jesus.breath",
        next ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  }

  const progress = goal > 0 ? Math.min(1, count / goal) : 0;
  const reachedGoal = count > 0 && count >= goal;

  return (
    <article className="mx-auto max-w-[640px] w-full">
      <header className="text-center mb-8">
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
          The Jesus Prayer
        </p>
        <h1 className="font-serif text-[24px] md:text-[28px] text-paper leading-[1.3]">
          Lord Jesus Christ, Son of God,<br />have mercy on me, a sinner.
        </h1>
      </header>

      {/* The counter card */}
      <div
        role="button"
        tabIndex={0}
        onClick={advance}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            advance();
          }
        }}
        className={cn(
          "relative rounded-2xl border bg-paper/[0.03] cursor-pointer select-none p-10 md:p-12 text-center transition-colors duration-200",
          reachedGoal
            ? "border-[#d4af37]/60 bg-[#d4af37]/[0.08]"
            : "border-paper/15 hover:bg-paper/[0.05]",
        )}
      >
        {breath && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span
              className="block rounded-full bg-[#d4af37]/15"
              style={{
                width: 160,
                height: 160,
                animation: "jp-breath 8s ease-in-out infinite",
              }}
            />
          </div>
        )}
        <p className="relative font-sans text-[12px] uppercase tracking-[1.5px] text-paper/55 mb-2">
          Tap to advance
        </p>
        <p
          className="relative font-sans text-[72px] md:text-[96px] font-bold text-paper tabular-nums leading-none"
          aria-live="polite"
        >
          {count}
        </p>
        <p className="relative font-sans text-[13px] text-paper/55 mt-3">
          of {goal} this session
        </p>
        <div className="relative h-[3px] mt-6 rounded-full bg-paper/8 overflow-hidden max-w-[280px] mx-auto">
          <div
            className="h-full bg-[#d4af37] transition-[width] duration-200 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={back}
          disabled={!hydrated || count <= 0}
          className="rounded-pill border border-paper/15 bg-paper/[0.04] px-4 h-[40px] font-sans text-[13px] text-paper/80 hover:bg-paper/10 disabled:opacity-40 disabled:hover:bg-paper/[0.04] transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={resetSession}
          disabled={!hydrated || count === 0}
          className="rounded-pill border border-paper/15 bg-paper/[0.04] px-4 h-[40px] font-sans text-[13px] text-paper/80 hover:bg-paper/10 disabled:opacity-40 disabled:hover:bg-paper/[0.04] transition-colors"
        >
          Reset session
        </button>
        <button
          type="button"
          onClick={toggleBreath}
          aria-pressed={breath}
          className={cn(
            "rounded-pill border px-4 h-[40px] font-sans text-[13px] transition-colors",
            breath
              ? "border-[#d4af37]/55 bg-[#d4af37]/15 text-[#f4dc91]"
              : "border-paper/15 bg-paper/[0.04] text-paper/80 hover:bg-paper/10",
          )}
        >
          Breath cue: {breath ? "On" : "Off"}
        </button>
      </div>

      {/* Goal presets */}
      <div className="mt-6">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45 text-center mb-3">
          Goal
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {PRESETS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => pickGoal(g)}
              className={cn(
                "rounded-pill border px-4 h-[36px] font-sans text-[13px] font-medium transition-colors tabular-nums",
                goal === g
                  ? "border-paper/45 bg-paper/15 text-paper"
                  : "border-paper/12 bg-paper/[0.03] text-paper/65 hover:bg-paper/10 hover:text-paper",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Today + streak */}
      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-paper/12 bg-paper/[0.03] p-4 text-center">
          <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/45 mb-1">
            Today
          </p>
          <p className="font-sans text-[22px] font-semibold text-paper tabular-nums">
            {todayTotal}
          </p>
        </div>
        <div className="rounded-md border border-paper/12 bg-paper/[0.03] p-4 text-center">
          <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/45 mb-1">
            Streak
          </p>
          <p className="font-sans text-[22px] font-semibold text-[#d4af37] tabular-nums">
            {streak}{" "}
            <span className="text-paper/45 text-[12px] font-normal tracking-normal">
              {streak === 1 ? "day" : "days"}
            </span>
          </p>
        </div>
      </div>

      {/* Teaching block (drawn from the existing learning lesson). */}
      <section className="mt-12 pt-8 border-t border-paper/10 space-y-5 font-serif text-[16px] text-paper/80 leading-[1.7]">
        <p>
          The Jesus Prayer is the heart of Orthodox spirituality. It is named
          for the Lord whose Name is invoked. It can be prayed standing,
          walking, working, lying awake at night. The Fathers call it the
          prayer of the heart because, with time, it sinks from the lips to
          the mind, and from the mind to the heart.
        </p>
        <p>
          St. Hesychios of Sinai writes that the Jesus Prayer is like a lamp
          in a dark room: as long as it burns, the room is full of light. Stop
          it, and the shadows return at once.
        </p>
        <p>
          Do not strain to feel anything. Simply say the words, slowly, in
          time with your breath if that helps. Breathe in: &quot;Lord Jesus
          Christ, Son of God,&quot; breathe out: &quot;have mercy on me, a
          sinner.&quot; When your mind wanders, do not be discouraged. Bring
          it back. The bringing-back is half the work.
        </p>
      </section>

      <style>{`
        @keyframes jp-breath {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.55); opacity: 0.25; }
        }
      `}</style>
    </article>
  );
}
