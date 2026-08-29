"use client";

/**
 * Larp mode. Every number in the panel, on blast.
 *
 * ── What it is for ──────────────────────────────────────────────────────
 *
 * The admin is honest to a fault and the honest numbers are currently small:
 * two paying subscribers, one shop order, $45 of revenue in a month. That is
 * fine to run a business on and useless for designing against. A layout that
 * looks balanced holding "3" falls apart holding "184,207", and there is no
 * way to find that out on real data until the real data arrives.
 *
 * So this inflates the reads. It is a display illusion and nothing else: no
 * request is altered on the way out, no row is written, and a reload with the
 * mode off shows the true books again.
 *
 * ── Why it announces itself ─────────────────────────────────────────────
 *
 * Turning it on is deliberately obscure. What it does while on is not. A
 * screenshot of a dashboard reading $180k of revenue, with nothing on the
 * frame saying it is invented, is a fabricated financial record, and it does
 * not stop being one because the person holding it knows better. The repo
 * already draws this line for review cards, which carry a visible SAMPLE badge
 * until real ones replace them. Same rule, same reason.
 *
 * The banner is therefore not optional and not subtle, and it renders inside
 * the panel so it lands in any screenshot of it.
 *
 * ── Why it inflates by key name ─────────────────────────────────────────
 *
 * A blanket "multiply every number" breaks the panel: ids stop matching,
 * timestamps land in the far future, percentages exceed 100, page sizes ask
 * for a million rows. So a field is inflated only when its NAME says it counts
 * money or people, and an explicit deny list protects the rest. Anything not
 * recognised is passed through untouched, which is the safe direction: a
 * number that failed to inflate is a dull demo, while a number that inflated
 * when it should not have is a broken screen.
 */

const KEY = "purify:admin:larp";
const EVENT = "purify:admin:larp-change";

/** Names that mean money or population. Inflated. */
const INFLATE =
  /(cents|revenue|profit|mrr|arr|amount|balance|payout|gross|net|earn|sales?|orders?|units?|sold|subscribers?|members?|users?|visitors?|pageviews?|views?|signups?|sessions?|claims?|count|total|bumps?|likes?|followers?)/i;

/**
 * Names that must never move, checked FIRST. Ids and timestamps are obvious.
 * The rest are the ones that bit during testing: `percent` and `rate` render
 * as "18400%", `limit` and `perPage` turn a page query into a scan, `version`
 * and `code` are identity, and `days` drives axis ranges that then draw
 * nothing.
 */
const NEVER =
  /(^id$|_id$|_at$|date|time|year|month|week|day|percent|pct|rate|ratio|share|version|code|limit|offset|page|size|index|order_?by|lat|lng|zoom|width|height|threshold|goal|target|price_?cents|supplier_cost)/i;

/** Deterministic 0..1 from a key, so a field inflates the same way every render. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * The multiplier for one field. Jittered per key rather than flat, because a
 * dashboard where every figure is exactly 900x the last one reads as a bug
 * rather than as a business.
 */
function factorFor(key: string): number {
  const base = /cents|revenue|profit|mrr|arr|amount|balance|payout|gross|net|earn/i.test(key)
    ? 820
    : 340;
  return Math.round(base * (0.55 + hash01(key) * 1.4));
}

export function larpOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    // Private mode, or storage blocked. Off is the correct answer, and the
    // panel must not throw on the way to finding that out.
    return false;
  }
}

export function setLarp(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to persist to; the event below still flips the session */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

export function onLarpChange(fn: (on: boolean) => void): () => void {
  const h = () => fn(larpOn());
  window.addEventListener(EVENT, h);
  // storage fires in the OTHER tabs, so a second admin window follows along.
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener("storage", h);
  };
}

/**
 * Walk a parsed API response and inflate what counts.
 *
 * Depth-capped and cycle-safe: this runs on every admin read, and a response
 * with a self-reference would otherwise hang the panel rather than show a
 * wrong number.
 */
export function inflate<T>(value: T, keyHint = "", depth = 0, seen = new WeakSet<object>()): T {
  if (depth > 12) return value;

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value === 0) return value;
    if (NEVER.test(keyHint) || !INFLATE.test(keyHint)) return value;
    const scaled = value * factorFor(keyHint);
    // Integers stay integers. A subscriber count of 1840.5 is a tell.
    return (Number.isInteger(value) ? Math.round(scaled) : scaled) as unknown as T;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return value;
    seen.add(value);
    // Array members inherit the key that named the array, so `revenueSeries`
    // inflates its points even though the indices are numbers.
    return value.map((v) => inflate(v, keyHint, depth + 1, seen)) as unknown as T;
  }

  if (value && typeof value === "object") {
    if (seen.has(value as object)) return value;
    seen.add(value as object);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = inflate(v, k, depth + 1, seen);
    }
    return out as unknown as T;
  }

  return value;
}
