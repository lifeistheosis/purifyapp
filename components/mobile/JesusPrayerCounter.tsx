"use client";

import { useRef, useSyncExternalStore } from "react";

const STORAGE_KEY = "purify:jesus-prayer-count";
const EVENT = "purify:jesus-prayer";

type Counter = { pos: number; count: number };

function readCounter(): Counter {
  if (typeof window === "undefined") return { pos: 0, count: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { pos: 0, count: 0 };
    const parsed = JSON.parse(raw) as Counter;
    return {
      pos: typeof parsed?.pos === "number" ? parsed.pos : 0,
      count: typeof parsed?.count === "number" ? parsed.count : 0,
    };
  } catch {
    return { pos: 0, count: 0 };
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

// Cached snapshot so useSyncExternalStore returns a stable reference
// between unchanged reads (otherwise React warns about infinite renders).
let cached: Counter = { pos: 0, count: 0 };
function getSnapshot(): Counter {
  const fresh = readCounter();
  if (fresh.pos !== cached.pos || fresh.count !== cached.count) {
    cached = fresh;
  }
  return cached;
}
function getServerSnapshot(): Counter {
  return { pos: 0, count: 0 };
}

function persist(next: Counter) {
  cached = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

/**
 * Small Jesus Prayer counter widget used under the Prayers mobile hero.
 *
 * Calm, unobtrusive: a 3x3 grid of dots that fills clockwise as the user
 * taps. Each full grid (9 taps) increments a counter underneath and the
 * grid resets. Long-press the counter to zero everything out.
 *
 * State persists to localStorage so the count carries across reloads on
 * the same device. The widget never speaks to the server; this is a
 * private aid to prayer, not a tracked metric.
 */
export function JesusPrayerCounter() {
  const { pos, count } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const longPress = useRef<number | null>(null);

  function tap() {
    const next = pos + 1;
    if (next >= 9) {
      persist({ pos: 0, count: count + 1 });
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.(8);
        } catch {
          /* ignore */
        }
      }
    } else {
      persist({ pos: next, count });
    }
  }

  function startReset() {
    if (longPress.current) window.clearTimeout(longPress.current);
    longPress.current = window.setTimeout(() => {
      persist({ pos: 0, count: 0 });
      longPress.current = null;
    }, 700);
  }
  function cancelReset() {
    if (longPress.current) {
      window.clearTimeout(longPress.current);
      longPress.current = null;
    }
  }

  return (
    <section
      className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5"
      aria-label="Jesus Prayer counter"
    >
      <p className="font-sans text-caption text-paper/55">The prayer of the heart</p>
      <p className="mt-0.5 font-sans text-ui text-paper/85 leading-snug">
        Lord Jesus Christ, Son of God, have mercy on me, a sinner.
      </p>

      <button
        type="button"
        onClick={tap}
        onPointerDown={startReset}
        onPointerUp={cancelReset}
        onPointerLeave={cancelReset}
        onPointerCancel={cancelReset}
        aria-label="Tap to count the prayer"
        className="mt-4 mx-auto grid grid-cols-3 gap-3 p-4 w-fit rounded-xl border border-paper/10 bg-night/60 active:bg-night/85 transition-colors"
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={
              "block h-4 w-4 rounded-full transition-colors " +
              (i < pos
                ? "bg-crimson"
                : "border border-paper/25 bg-night")
            }
          />
        ))}
      </button>

      <p className="mt-4 text-center font-sans text-caption text-paper/55 tabular-nums">
        <span className="text-paper font-semibold text-lede block leading-none">
          {count}
        </span>
        <span className="mt-1 block">
          full rounds today · {pos}/9 in this round
        </span>
      </p>
      <p className="mt-2 text-center font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/35">
        Long-press to reset
      </p>
    </section>
  );
}
