// pickDaily: the five questions for a (date, reckoning), as a pure function.
//
// Every reader on a given day and reckoning gets the same five, and the web
// server, the native bundle and a unit test all agree without a database.
// That is what lets the page bake a date-keyed window for the static export
// (see window.ts) and lets the attempt route re-derive the set it grades
// against instead of trusting the client's list.
//
// THE ALGORITHM, in the order it runs:
//
//   1. seed = the first 32 bits of sha256(`${date}:${reckoning}`), driving a
//      xorshift32. Every random choice below reads from that one stream, so
//      the output is a function of (bank, date, reckoning, calendar data).
//   2. anchor: the day's commemorations on the SHIFTED date and its readings
//      on the CIVIL date, exactly as useChurchDay splits them. Any eligible
//      question whose calendar_anchor matches is a candidate; one is drawn.
//      Skipped when the bank holds fewer than ANCHOR_MIN_BANK eligible
//      questions, because a small bank cannot both anchor and keep the
//      no-repeat rule, and no-repeat wins.
//   3. the remaining four: a weighted draw without replacement. Weight is
//      1 / (1 + days since last shown within the trailing NO_REPEAT_DAYS),
//      1 for anything not shown in that window, times a tag balance factor
//      that up-weights tags the trailing window under-covered. Questions
//      shown in the window are excluded outright when enough others remain,
//      which is the "never repeat within 7 days when the bank allows" rule.
//   4. anchor first, then the four in draw order.
//
// THE HISTORY. "Days since last shown" needs the prior seven days' sets, and
// each of those needed its own prior seven. Rather than cut that regress off
// at an arbitrary depth (which would make the answer depend on who asked),
// sets are computed in order from a fixed EPOCH and memoised per bank. A day
// a year past the epoch costs a few hundred cheap draws, once per process.
//
// A NOTE ON THE WEIGHT FORMULA. It is implemented as the spec states it:
// 1 / (1 + days since shown). Read literally that ranks a question shown
// yesterday (1/2) above one shown six days ago (1/7). The exclusion in step 3
// means the formula is only reached when the bank is too small to avoid
// repeats at all, so in practice it decides the order of last resort and
// nothing else. Recorded here rather than silently corrected.

import { createHash } from "node:crypto";

import {
  commemorationsOn,
  feastsOn,
  readingsOn,
  shiftForStyle,
} from "@/lib/calendar/orthodox";

import { addDaysIso, dateFromIso } from "./dates";
import {
  ANCHOR_MIN_BANK,
  NO_REPEAT_DAYS,
  QUESTIONS_PER_DAY,
  type Question,
  type Reckoning,
} from "./types";

/** The first day sets are chained from. Nothing before it has a history. */
export const EPOCH = "2026-01-01";

/**
 * What a day looks like to the anchor rule. `saints` are slugs commemorated
 * on the shifted date, `feast` is that date's MM-DD key, `readings` are
 * "book:chapter" for the civil date's appointed passages.
 */
export type DayCalendar = {
  saints: ReadonlySet<string>;
  feast: string;
  readings: ReadonlySet<string>;
};

export type CalendarLookup = (date: string, reckoning: Reckoning) => DayCalendar;

// ── Dates ────────────────────────────────────────────────────────────────

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function mmdd(d: Date): string {
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// ── Calendar ─────────────────────────────────────────────────────────────

/**
 * The day as the anchor rule sees it. The split is the one useChurchDay
 * makes and documents: the menologion moves with the reckoning, the paschal
 * cycle does not.
 */
export const churchCalendar: CalendarLookup = (date, reckoning) => {
  const civil = dateFromIso(date);
  const shifted = shiftForStyle(civil, reckoning);
  const saints = new Set<string>();
  for (const c of commemorationsOn(shifted)) if (c.slug) saints.add(c.slug);
  for (const s of feastsOn(shifted)) saints.add(s.slug);
  const readings = new Set<string>();
  for (const r of readingsOn(civil)) readings.add(`${r.book}:${r.chapter}`);
  return { saints, feast: mmdd(shifted), readings };
};

// ── Seed and generator ───────────────────────────────────────────────────

/** The first 32 bits of sha256(`${date}:${reckoning}`), as an unsigned int. */
export function seedFor(date: string, reckoning: Reckoning): number {
  const digest = createHash("sha256").update(`${date}:${reckoning}`).digest();
  return digest.readUInt32BE(0);
}

/** xorshift32. Returns a generator of floats in [0, 1). */
export function xorshift32(seed: number): () => number {
  // The zero state is a fixed point of xorshift; nudge it off.
  let x = seed >>> 0 || 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 0x100000000;
  };
}

// ── Eligibility and matching ─────────────────────────────────────────────

export function isEligible(q: Question, date: string): boolean {
  if (q.retired_at) return false;
  if (q.published_at && q.published_at.slice(0, 10) > date) return false;
  return true;
}

export function matchesAnchor(q: Question, cal: DayCalendar): boolean {
  const a = q.calendar_anchor;
  if (!a) return false;
  if (a.saint && cal.saints.has(a.saint)) return true;
  if (a.feast && a.feast === cal.feast) return true;
  if (a.reading && cal.readings.has(`${a.reading.book}:${a.reading.chapter}`)) return true;
  return false;
}

// ── The draw ─────────────────────────────────────────────────────────────

type History = {
  /** question id -> days since last shown, 1..NO_REPEAT_DAYS */
  lastShown: Map<string, number>;
  /** tag -> how many times it appeared in the trailing window */
  tagCoverage: Map<string, number>;
};

function historyFrom(
  bank: ReadonlyMap<string, Question>,
  prior: string[][],
): History {
  const lastShown = new Map<string, number>();
  const tagCoverage = new Map<string, number>();
  prior.forEach((ids, i) => {
    const daysAgo = i + 1;
    for (const id of ids) {
      if (!lastShown.has(id)) lastShown.set(id, daysAgo);
      for (const tag of bank.get(id)?.tags ?? []) {
        tagCoverage.set(tag, (tagCoverage.get(tag) ?? 0) + 1);
      }
    }
  });
  return { lastShown, tagCoverage };
}

function weightOf(q: Question, h: History): number {
  const daysAgo = h.lastShown.get(q.id);
  const recency = daysAgo === undefined ? 1 : 1 / (1 + daysAgo);
  if (q.tags.length === 0) return recency;
  let sum = 0;
  for (const tag of q.tags) sum += 1 / (1 + (h.tagCoverage.get(tag) ?? 0));
  return recency * (sum / q.tags.length);
}

function drawWeighted(
  pool: Question[],
  count: number,
  h: History,
  rng: () => number,
): string[] {
  const remaining = pool.slice();
  const out: string[] = [];
  while (out.length < count && remaining.length > 0) {
    const weights = remaining.map((q) => weightOf(q, h));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let idx = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      r -= weights[i];
      if (r < 0) {
        idx = i;
        break;
      }
    }
    out.push(remaining[idx].id);
    remaining.splice(idx, 1);
  }
  return out;
}

/**
 * One day's set given the prior days' sets (most recent first). This is the
 * whole rule; pickDaily only supplies the history.
 */
export function pickWithHistory(
  bank: readonly Question[],
  date: string,
  reckoning: Reckoning,
  prior: string[][],
  calendar: CalendarLookup = churchCalendar,
): string[] {
  const eligible = bank
    .filter((q) => isEligible(q, date))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (eligible.length === 0) return [];

  const byId = new Map(eligible.map((q) => [q.id, q]));
  const history = historyFrom(byId, prior.slice(0, NO_REPEAT_DAYS));
  const rng = xorshift32(seedFor(date, reckoning));
  const chosen: string[] = [];

  if (eligible.length >= ANCHOR_MIN_BANK) {
    const cal = calendar(date, reckoning);
    const candidates = eligible.filter((q) => matchesAnchor(q, cal));
    const fresh = candidates.filter((q) => !history.lastShown.has(q.id));
    const pool = fresh.length > 0 ? fresh : candidates;
    if (pool.length > 0) chosen.push(pool[Math.floor(rng() * pool.length)].id);
  }

  const need = Math.min(QUESTIONS_PER_DAY, eligible.length) - chosen.length;
  const rest = eligible.filter((q) => !chosen.includes(q.id));
  const unseen = rest.filter((q) => !history.lastShown.has(q.id));
  const pool = unseen.length >= need ? unseen : rest;
  chosen.push(...drawWeighted(pool, need, history, rng));
  return chosen;
}

// ── The chain from the epoch ─────────────────────────────────────────────

type Chain = Map<string, string[]>;
const CACHE = new WeakMap<readonly Question[], WeakMap<CalendarLookup, Map<Reckoning, Chain>>>();

function chainFor(
  bank: readonly Question[],
  reckoning: Reckoning,
  calendar: CalendarLookup,
): Chain {
  let byCal = CACHE.get(bank);
  if (!byCal) {
    byCal = new WeakMap();
    CACHE.set(bank, byCal);
  }
  let byReck = byCal.get(calendar);
  if (!byReck) {
    byReck = new Map();
    byCal.set(calendar, byReck);
  }
  let chain = byReck.get(reckoning);
  if (!chain) {
    chain = new Map();
    byReck.set(reckoning, chain);
  }
  return chain;
}

/**
 * The five question ids for a date and reckoning. Deterministic and
 * precomputable: the same bank, date and reckoning always answer the same.
 *
 * `calendar` is injectable so a test can put a saint on a chosen day without
 * depending on the corpus. Results are memoised per (bank array, calendar
 * function); pass a fresh array to compute from scratch.
 */
export function pickDaily(
  bank: readonly Question[],
  date: string,
  reckoning: Reckoning,
  calendar: CalendarLookup = churchCalendar,
): string[] {
  if (!ISO.test(date)) throw new Error(`Not a YYYY-MM-DD date: ${date}`);
  const chain = chainFor(bank, reckoning, calendar);
  const cached = chain.get(date);
  if (cached) return cached;

  // Before the epoch there is no history to replay; the day stands alone.
  if (date < EPOCH) {
    const set = pickWithHistory(bank, date, reckoning, [], calendar);
    chain.set(date, set);
    return set;
  }

  // Walk forward from the last day already in the chain, or the epoch.
  let cursor = EPOCH;
  for (const known of chain.keys()) {
    if (known >= EPOCH && known > cursor && known <= date) cursor = addDaysIso(known, 1);
  }
  const window: string[][] = [];
  for (let d = 1; d <= NO_REPEAT_DAYS; d++) {
    const prev = addDaysIso(cursor, -d);
    if (prev < EPOCH) break;
    window.push(chain.get(prev) ?? []);
  }
  for (let day = cursor; day <= date; day = addDaysIso(day, 1)) {
    const set = pickWithHistory(bank, day, reckoning, window, calendar);
    chain.set(day, set);
    window.unshift(set);
    if (window.length > NO_REPEAT_DAYS) window.pop();
  }
  return chain.get(date) ?? [];
}
