import type { LastRead } from "@/lib/bible/lastRead";
import type { PlanProgress, PlansState } from "@/lib/plans/progress";
import type { ReaderPosition } from "@/lib/reader/position";
import { cleanItems, kindOfKey, mergeItems } from "@/lib/remember/items";
import { cleanChosen, type Entry, type RememberStore } from "@/lib/remember/schedule";

/**
 * How two devices' copies of what a reader keeps become one (1.9, PLAN row
 * 29, s5-09): the merge rules of lib/sync/kept.ts, pure, so each is tested
 * without a phone or a server.
 *
 * Every rule is the same rule at a different size: item by item, the copy
 * changed last wins. A device pulls before it pushes (lib/sync/kept.ts), so a
 * reader who reads on the phone and then on the tablet always continues from
 * the phone's place. Two devices changing the same item while apart is the
 * one case a rule must decide, and the newer change is the one the reader
 * made last.
 *
 *   plans     plan by plan, by when the plan last changed; a plan started over
 *             leaves its time, so an older copy elsewhere does not bring the
 *             old progress back. Two copies from before 1.9, with no time on
 *             either, keep every day read on both.
 *   remember  verse by verse, by when the verse was last answered; the day's
 *             answer by the later day. What the reader learns besides their
 *             saved verses (build 93 note 11, lib/remember/items.ts) item by
 *             item, the later of its adding and its taking off; the one they
 *             chose by when they chose it.
 *   places    the Bible's place, and each long work's, by when it was kept;
 *             a work finished leaves its time, as a plan started over does.
 *   reading   the palette and the reader's settings, as one, by when they
 *             last changed.
 *
 * Nothing here trusts what it is given: a value from the server is read the
 * way a value from the device is, and anything not of its shape is left out.
 */

export type PlansSlice = { plans: PlansState; resets: Record<string, number> };
export type RememberSlice = Pick<RememberStore, "entries" | "answeredOn" | "answeredKey" | "items" | "chosen">;
export type PlacesSlice = {
  bible: LastRead | null;
  works: Record<string, ReaderPosition>;
  /** When a work's place was let go, its end reached, by "<saint>/<work>". */
  cleared: Record<string, number>;
};
export type ReadingSlice = { at: number; values: Record<string, string | null> };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const time = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

// ── Plans ────────────────────────────────────────────────────────────────

function cleanPlan(v: unknown): PlanProgress | null {
  if (!isObject(v) || typeof v.startedOn !== "string" || !DAY.test(v.startedOn) || !isObject(v.done)) return null;
  const done: Record<string, string> = {};
  for (const [i, day] of Object.entries(v.done)) if (/^\d{1,4}$/.test(i) && typeof day === "string" && DAY.test(day)) done[i] = day;
  const plan: PlanProgress = { startedOn: v.startedOn, done };
  if (time(v.at)) plan.at = time(v.at);
  return plan;
}

export function cleanPlansSlice(v: unknown): PlansSlice {
  const plans: PlansState = {};
  const resets: Record<string, number> = {};
  if (isObject(v)) {
    if (isObject(v.plans)) for (const [id, p] of Object.entries(v.plans)) {
      const plan = cleanPlan(p);
      if (plan) plans[id] = plan;
    }
    if (isObject(v.resets)) for (const [id, at] of Object.entries(v.resets)) if (time(at)) resets[id] = time(at);
  }
  return { plans, resets };
}

/**
 * Two copies of the reader's plans, one plan at a time (Fable's release check
 * 1, M2). `met` is the plans this device has already merged with the server.
 *
 * The first time a plan meets the server from a device, the two copies are
 * joined: every day read on either is kept, since each device has days the
 * other never saw (a phone with 200 days and a tablet with 5 must not lose the
 * 200 because the tablet was touched last). After that, both started from the
 * same joined copy, so the copy changed last wins, and a day taken back stays
 * taken back. A copy from before the plan was last started over belongs to the
 * run given up and is never joined. Without `met`, every plan is taken as met.
 */
export function mergePlans(local: PlansSlice, remote: PlansSlice, met?: ReadonlySet<string>): PlansSlice {
  const resets: Record<string, number> = { ...local.resets };
  for (const [id, at] of Object.entries(remote.resets)) resets[id] = Math.max(resets[id] ?? 0, at);
  const plans: PlansState = {};
  for (const id of new Set([...Object.keys(local.plans), ...Object.keys(remote.plans)])) {
    const reset = resets[id];
    // Started over after this copy last changed: that copy is gone.
    const live = (p: PlanProgress | undefined) => (p && !(reset !== undefined && reset >= (p.at ?? 0)) ? p : undefined);
    const a = live(local.plans[id]);
    const b = live(remote.plans[id]);
    if (!a && !b) continue;
    if (a && b && ((!a.at && !b.at) || (met !== undefined && !met.has(id)))) {
      // Both from before 1.9, when neither can say which is newer, or this
      // device's first exchange for the plan: no day read on either is lost.
      plans[id] = joined(a, b);
    } else if (a && b) {
      plans[id] = (b.at ?? 0) > (a.at ?? 0) ? b : a;
    } else {
      plans[id] = (a ?? b)!;
    }
  }
  return { plans, resets };
}

/** Both copies' days, the earlier start, and the later change. On a day both kept, this device's date stands. */
function joined(a: PlanProgress, b: PlanProgress): PlanProgress {
  const plan: PlanProgress = { startedOn: a.startedOn <= b.startedOn ? a.startedOn : b.startedOn, done: { ...b.done, ...a.done } };
  const at = Math.max(a.at ?? 0, b.at ?? 0);
  if (at) plan.at = at;
  return plan;
}

// ── Remember the verse ──────────────────────────────────────────────────

function cleanEntry(v: unknown): Entry | null {
  if (!isObject(v) || typeof v.box !== "number" || !Number.isInteger(v.box) || v.box < 0 || v.box > 6) return null;
  if (typeof v.due !== "string" || !DAY.test(v.due)) return null;
  const entry: Entry = { box: v.box, due: v.due };
  if (time(v.at)) entry.at = time(v.at);
  return entry;
}

export function cleanRememberSlice(v: unknown): RememberSlice {
  const entries: Record<string, Entry> = {};
  if (isObject(v) && isObject(v.entries)) {
    for (const [key, e] of Object.entries(v.entries)) {
      const entry = kindOfKey(key) ? cleanEntry(e) : null;
      if (entry) entries[key] = entry;
    }
  }
  const answeredOn = isObject(v) && typeof v.answeredOn === "string" && DAY.test(v.answeredOn) ? v.answeredOn : undefined;
  const answeredKey = isObject(v) && typeof v.answeredKey === "string" && entries[v.answeredKey] ? v.answeredKey : undefined;
  const slice: RememberSlice = { entries, answeredOn, answeredKey, items: cleanItems(isObject(v) ? v.items : undefined) };
  const chosen = isObject(v) ? cleanChosen(v.chosen) : undefined;
  if (chosen) slice.chosen = chosen;
  return slice;
}

export function mergeRemember(local: RememberSlice, remote: RememberSlice): RememberSlice {
  const entries: Record<string, Entry> = { ...local.entries };
  for (const [key, b] of Object.entries(remote.entries)) {
    const a = entries[key];
    if (!a || (b.at ?? 0) > (a.at ?? 0)) entries[key] = b;
  }
  // The day's answer is the later day's; on the same day, the newer answer's.
  const answeredAt = (s: RememberSlice) => (s.answeredKey ? (s.entries[s.answeredKey]?.at ?? 0) : 0);
  const later =
    (remote.answeredOn ?? "") > (local.answeredOn ?? "") ||
    (remote.answeredOn !== undefined && remote.answeredOn === local.answeredOn && answeredAt(remote) > answeredAt(local))
      ? remote
      : local;
  const merged: RememberSlice = { entries, answeredOn: later.answeredOn, answeredKey: later.answeredKey, items: mergeItems(local.items, remote.items) };
  // The one chosen is the one chosen last, on whichever device.
  const chosen = (remote.chosen?.at ?? 0) > (local.chosen?.at ?? 0) ? remote.chosen : local.chosen;
  if (chosen) merged.chosen = chosen;
  return merged;
}

/**
 * Whether a quote's words and the reader's own leave the device (build 93
 * note 11). OFF until the privacy page says so: the page says of this row
 * "which verse is due when, not its words" (his yes to 59, 2026-11-10), and
 * a quote's words and a reader's own would be words. The sentence that makes
 * it true is with the owner; his yes turns this on in the same commit that
 * puts the sentence on the page, and
 * lib/sync/__tests__/learnedWordsTravel.test.ts refuses one without the
 * other.
 *
 * While it is off, what the page already says is what travels: each item's
 * schedule, which one is chosen, and a verse taken by its place (its place,
 * never its words). A quote and the reader's own words stay where they were
 * made.
 */
export const LEARNED_WORDS_TRAVEL = false;

/** The words the privacy page must carry before the switch is on, in each of the page's languages. */
export const LEARNED_WORDS_SENTENCES = {
  en: "the quotes and your own words that you chose to learn by heart (kept with their words, since they cannot be fetched again the way a verse can)",
  de: "die Zitate und deine eigenen Worte, die du auswendig lernen willst (diese mit ihrem Wortlaut, weil sie sich nicht wie ein Vers neu laden lassen)",
} as const;

const wordless = (items: RememberSlice["items"]): RememberSlice["items"] =>
  Object.fromEntries(Object.entries(items).filter(([key]) => kindOfKey(key) === "verse"));

/** A copy as it may leave the device, or be read from the server: with the switch off, without a quote's words or the reader's own. */
export function travelling(slice: RememberSlice, on: boolean = LEARNED_WORDS_TRAVEL): RememberSlice {
  return on ? slice : { ...slice, items: wordless(slice.items) };
}

/**
 * A merged copy as it is put in place on the device: with the switch off the
 * merge never saw this device's quotes and own words, so they are put back
 * beside what it merged, and nothing typed here is lost to an exchange.
 */
export function withDeviceWords(merged: RememberSlice, device: RememberSlice, on: boolean = LEARNED_WORDS_TRAVEL): RememberSlice {
  if (on) return merged;
  const here = Object.fromEntries(Object.entries(device.items).filter(([key]) => kindOfKey(key) !== "verse"));
  return { ...merged, items: { ...merged.items, ...here } };
}

// ── Places ───────────────────────────────────────────────────────────────

function cleanBible(v: unknown): LastRead | null {
  if (!isObject(v) || typeof v.book !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.book)) return null;
  const chapter = Number(v.chapter);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 200) return null;
  const verse = Number(v.verse);
  const total = Number(v.totalVerses);
  return {
    book: v.book,
    bookName: typeof v.bookName === "string" ? v.bookName.slice(0, 60) : v.book,
    chapter,
    verse: Number.isInteger(verse) && verse >= 1 ? verse : 1,
    totalVerses: Number.isInteger(total) && total >= 0 ? total : 0,
    ts: time(v.ts),
  };
}

function cleanPosition(v: unknown): ReaderPosition | null {
  if (!isObject(v)) return null;
  const { sectionN, paragraph, savedAt } = v;
  if (typeof sectionN !== "number" || !Number.isInteger(sectionN) || sectionN < 0) return null;
  return {
    sectionN,
    paragraph: typeof paragraph === "number" && Number.isInteger(paragraph) && paragraph >= 0 ? paragraph : 0,
    savedAt: time(savedAt),
  };
}

/** A work's key, as position.ts keeps it: "<saint-slug>/<work-slug>". */
const WORK = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function cleanPlacesSlice(v: unknown): PlacesSlice {
  const works: Record<string, ReaderPosition> = {};
  const cleared: Record<string, number> = {};
  if (isObject(v) && isObject(v.works)) {
    for (const [key, p] of Object.entries(v.works)) {
      const place = WORK.test(key) ? cleanPosition(p) : null;
      if (place) works[key] = place;
    }
  }
  if (isObject(v) && isObject(v.cleared)) for (const [key, at] of Object.entries(v.cleared)) if (WORK.test(key) && time(at)) cleared[key] = time(at);
  return { bible: isObject(v) ? cleanBible(v.bible) : null, works, cleared };
}

export function mergePlaces(local: PlacesSlice, remote: PlacesSlice): PlacesSlice {
  const bible = !local.bible ? remote.bible : !remote.bible ? local.bible : remote.bible.ts > local.bible.ts ? remote.bible : local.bible;
  const cleared: Record<string, number> = { ...local.cleared };
  for (const [key, at] of Object.entries(remote.cleared)) cleared[key] = Math.max(cleared[key] ?? 0, at);
  const works: Record<string, ReaderPosition> = { ...local.works };
  for (const [key, b] of Object.entries(remote.works)) {
    const a = works[key];
    if (!a || b.savedAt > a.savedAt) works[key] = b;
  }
  // A work finished after its place was last kept has no place.
  for (const [key, place] of Object.entries(works)) if ((cleared[key] ?? -1) >= place.savedAt) delete works[key];
  return { bible, works, cleared };
}

// ── Reading settings ─────────────────────────────────────────────────────

/** The settings that travel, by the keys the reader's device keeps them under. */
export const READING_KEYS = [
  "purify.reader.theme",
  "purify.reader.size",
  "purify.reader.font",
  "purify.reader.leading",
  "purify.reader.focus",
] as const;

export function cleanReadingSlice(v: unknown): ReadingSlice {
  const values: Record<string, string | null> = {};
  if (isObject(v) && isObject(v.values)) {
    for (const key of READING_KEYS) {
      const value = v.values[key];
      if (value === null || (typeof value === "string" && value.length <= 40)) values[key] = value as string | null;
    }
  }
  return { at: isObject(v) ? time(v.at) : 0, values };
}

export function mergeReading(local: ReadingSlice, remote: ReadingSlice): ReadingSlice {
  return remote.at > local.at ? remote : local;
}

// ── Which is which ───────────────────────────────────────────────────────

/** The same value, whatever order its keys were written in. */
export function sameValue(a: unknown, b: unknown): boolean {
  const canon = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canon)
      : isObject(v)
        ? Object.fromEntries(
            Object.keys(v)
              .filter((k) => v[k] !== undefined)
              .sort()
              .map((k) => [k, canon(v[k])]),
          )
        : v;
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}
