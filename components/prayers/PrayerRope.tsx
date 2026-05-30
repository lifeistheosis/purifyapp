"use client";

// Digital prayer rope (komvoschini / chotki).
//
// One job: count, quietly. Tap the rope or press Space/Enter to advance a
// knot; on the final knot, fire a small celebration tone (if enabled) and
// the rope wraps. A session is committed to localStorage when the user
// closes the page or presses "Save session" — never silently.
//
// Visual: a single dark surface with the prayer line at top, a SVG rope
// circle, a knot counter, and a tiny settings affordance. No streaks, no
// gamification — only the lifetime knots-this-year number, which never
// shrinks.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  appendRopeSession,
  ropeStats,
  uuid,
  useRopeSettings,
  writeRopeSettings,
  type RopeSettings,
} from "@/lib/prayers/storage";

const LINES = [
  "Lord Jesus Christ, Son of God, have mercy on me, a sinner.",
  "Lord Jesus Christ, have mercy on me.",
  "Most Holy Theotokos, save us.",
  "Holy God, Holy Mighty, Holy Immortal, have mercy on us.",
] as const;

export function PrayerRope() {
  const settings = useRopeSettings();
  const [count, setCount] = useState(0);
  const [sessionStart] = useState<string>(() => new Date().toISOString());
  const [stats, setStats] = useState({ yearKnots: 0, weekKnots: 0, yearSessions: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [bellNote, setBellNote] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Stats live re-read from localStorage on every prayer event.
  useEffect(() => {
    function recompute() {
      setStats(ropeStats());
    }
    recompute();
    window.addEventListener("purify:rope", recompute);
    return () => window.removeEventListener("purify:rope", recompute);
  }, []);

  // Save the in-flight session on unload so a crash doesn't lose progress.
  useEffect(() => {
    const handler = () => commit();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const knotCount = settings.knotCount;
  const completedLoops = Math.floor(count / knotCount);
  const currentKnot = count % knotCount;

  const advance = useCallback(() => {
    setCount((c) => {
      const next = c + 1;
      if (settings.haptics && typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(8);
        } catch {
          /* ignore */
        }
      }
      // Bell tone every 25 knots, only when enabled.
      if (settings.bell && next % 25 === 0) {
        playBell();
        setBellNote("•");
        setTimeout(() => setBellNote(null), 600);
      }
      return next;
    });
  }, [settings.haptics, settings.bell]);

  function commit() {
    if (count === 0) return;
    appendRopeSession({
      id: uuid(),
      startedAt: sessionStart,
      knots: count,
      line: settings.line,
    });
    setCount(0);
  }

  function playBell() {
    try {
      type WindowWithLegacyAudio = Window & { webkitAudioContext?: typeof AudioContext };
      const ctorWindow = window as WindowWithLegacyAudio;
      const Ctx = window.AudioContext ?? ctorWindow.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.6);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    } catch {
      /* ignore */
    }
  }

  // Keyboard: space or enter advances; backspace decrements (mis-tap fix).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showSettings) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advance();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setCount((c) => Math.max(0, c - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, showSettings]);

  // Geometry for the SVG rope.
  const dots = useMemo(() => {
    const cx = 200;
    const cy = 200;
    const r = 160;
    const arr: { x: number; y: number; idx: number }[] = [];
    for (let i = 0; i < knotCount; i++) {
      const theta = -Math.PI / 2 + (i / knotCount) * Math.PI * 2;
      arr.push({
        x: cx + r * Math.cos(theta),
        y: cy + r * Math.sin(theta),
        idx: i,
      });
    }
    return arr;
  }, [knotCount]);

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night text-paper relative select-none">
      <header className="px-5 md:px-8 pt-10">
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55">
          Prayer rope
        </p>
        <h1 className="mt-1 font-sans text-[28px] md:text-[32px] font-bold text-paper">
          {settings.line}
        </h1>
        <p className="mt-1 font-sans text-[12px] text-paper/40">
          {knotCount}-knot rope · tap the rope or press space.{" "}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="underline underline-offset-2 decoration-paper/30 hover:decoration-paper hover:text-paper transition-colors"
          >
            Settings
          </button>
        </p>
      </header>

      <div
        className="px-5 md:px-8 py-8 grid place-items-center cursor-pointer"
        onClick={advance}
        role="button"
        tabIndex={0}
        aria-label={`Advance one knot. Current: ${currentKnot} of ${knotCount}.`}
      >
        <svg
          viewBox="0 0 400 400"
          width="100%"
          height="auto"
          style={{ maxWidth: 460 }}
          aria-hidden="true"
        >
          {/* Subtle guide ring */}
          <circle
            cx={200}
            cy={200}
            r={160}
            fill="none"
            stroke="rgba(245,235,210,0.06)"
            strokeWidth={1}
          />
          {/* Cross marker at the top (start) */}
          <g transform="translate(200, 30)">
            <line
              x1={0}
              y1={-7}
              x2={0}
              y2={7}
              stroke="var(--color-gold)"
              strokeWidth={2}
            />
            <line
              x1={-5}
              y1={0}
              x2={5}
              y2={0}
              stroke="var(--color-gold)"
              strokeWidth={2}
            />
          </g>
          {dots.map((d) => {
            const past = d.idx < currentKnot;
            const isCurrent = d.idx === currentKnot;
            return (
              <circle
                key={d.idx}
                cx={d.x}
                cy={d.y}
                r={isCurrent ? 7 : 4}
                fill={
                  past
                    ? "var(--color-gold)"
                    : isCurrent
                      ? "var(--color-gold)"
                      : "rgba(245,235,210,0.18)"
                }
                opacity={past ? 0.85 : 1}
                stroke={isCurrent ? "var(--color-gold)" : "none"}
                strokeOpacity={0.4}
                strokeWidth={isCurrent ? 6 : 0}
              />
            );
          })}
          <text
            x={200}
            y={200}
            textAnchor="middle"
            fontSize={62}
            fontWeight={700}
            fill="var(--color-paper)"
            fontFamily="ui-sans-serif, system-ui"
            className="tabular-nums select-none pointer-events-none"
          >
            {currentKnot}
          </text>
          <text
            x={200}
            y={234}
            textAnchor="middle"
            fontSize={12}
            fill="rgba(245,235,210,0.45)"
            fontFamily="ui-sans-serif, system-ui"
            className="select-none pointer-events-none"
          >
            of {knotCount}
            {completedLoops > 0 && ` · loop ${completedLoops + 1}`}
          </text>
        </svg>
      </div>

      {bellNote && (
        <p className="absolute top-4 right-4 font-sans text-[12px] text-gold animate-pulse">
          {bellNote}
        </p>
      )}

      <footer className="px-5 md:px-8 pb-10">
        <div className="grid grid-cols-3 gap-3 max-w-[600px] mx-auto">
          <Stat label="This session" value={count} />
          <Stat label="Last 7 days" value={stats.weekKnots + count} />
          <Stat
            label={`${new Date().getFullYear()} so far`}
            value={stats.yearKnots + count}
            accent
          />
        </div>
        <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={commit}
            disabled={count === 0}
            className="inline-flex items-center gap-2 rounded-pill border border-gold/40 bg-gold/[0.08] text-gold px-5 py-2 font-sans text-[13px] font-semibold hover:bg-gold/[0.14] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save session
          </button>
          <button
            type="button"
            onClick={() => setCount((c) => Math.max(0, c - 1))}
            className="inline-flex items-center gap-2 rounded-pill border border-paper/20 bg-paper/[0.04] text-paper/75 px-4 py-2 font-sans text-[13px] hover:bg-paper/10 transition-colors"
          >
            ← one back
          </button>
          <button
            type="button"
            onClick={() => setCount(0)}
            className="inline-flex items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.02] text-paper/55 px-4 py-2 font-sans text-[13px] hover:text-paper transition-colors"
          >
            Reset
          </button>
        </div>
      </footer>

      {showSettings && (
        <SettingsDrawer
          settings={settings}
          onChange={writeRopeSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-md border ${accent ? "border-gold/35 bg-gold/[0.06]" : "border-paper/10 bg-paper/[0.02]"} p-4 text-center`}>
      <p className={`font-sans text-[11px] uppercase tracking-[1.2px] ${accent ? "text-gold/80" : "text-paper/45"}`}>
        {label}
      </p>
      <p className={`mt-1 font-sans text-[24px] font-bold tabular-nums ${accent ? "text-gold" : "text-paper"}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function SettingsDrawer({
  settings,
  onChange,
  onClose,
}: {
  settings: RopeSettings;
  onChange: (next: RopeSettings) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-night/80 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-night border-t md:border border-paper/15 rounded-t-lg md:rounded-lg w-full md:w-[420px] max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55">
            Rope settings
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-paper/55 hover:text-paper text-[18px]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <fieldset className="mb-5">
          <legend className="font-sans text-[12px] text-paper/55 mb-2">Knots</legend>
          <div className="flex gap-2 flex-wrap">
            {[33, 50, 100].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onChange({ ...settings, knotCount: k as 33 | 50 | 100 })}
                className={
                  "rounded-pill px-4 py-1.5 font-sans text-[13px] border transition-colors " +
                  (settings.knotCount === k
                    ? "border-gold/45 bg-gold/[0.08] text-gold"
                    : "border-paper/15 bg-paper/[0.03] text-paper/75 hover:bg-paper/10")
                }
              >
                {k}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mb-5">
          <legend className="font-sans text-[12px] text-paper/55 mb-2">Prayer line</legend>
          <div className="space-y-2">
            {LINES.map((l) => (
              <label
                key={l}
                className="flex gap-3 items-start cursor-pointer p-3 rounded-md border border-paper/10 hover:bg-paper/[0.02]"
              >
                <input
                  type="radio"
                  name="line"
                  checked={settings.line === l}
                  onChange={() => onChange({ ...settings, line: l })}
                  className="mt-1 accent-[var(--color-gold)]"
                />
                <span className="font-serif text-[14.5px] text-paper/85 leading-snug">
                  {l}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2 mb-5">
          <legend className="font-sans text-[12px] text-paper/55 mb-2">Aids</legend>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="font-sans text-[13.5px] text-paper">
              Vibrate on each knot
              <span className="block text-[11px] text-paper/45">
                Subtle haptic on supported devices.
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings.haptics}
              onChange={(e) => onChange({ ...settings, haptics: e.target.checked })}
              className="accent-[var(--color-gold)] w-4 h-4"
            />
          </label>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="font-sans text-[13.5px] text-paper">
              Bell every 25 knots
              <span className="block text-[11px] text-paper/45">
                Quiet sine-wave tone, ~0.6s.
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings.bell}
              onChange={(e) => onChange({ ...settings, bell: e.target.checked })}
              className="accent-[var(--color-gold)] w-4 h-4"
            />
          </label>
        </fieldset>

        <p className="font-sans text-[11px] text-paper/40 leading-relaxed">
          Counts are stored on this device. Signed-in users sync sessions
          across devices automatically.
        </p>
      </div>
    </div>
  );
}
