import profiledSaints from "@/data/calendar/profiled-saints.json";
import nextUpdate from "@/data/changelog/next-update.json";
import { nextNameDay } from "@/lib/desktop/presenceModes";
import type { HourRuleId } from "@/lib/prayers/ruleForHour";
import { keyOf, type DayKey } from "@/lib/rhythm/dayKey";
import { ICONS_URL_PREFIX, iconRightsFor } from "@/lib/saints/iconRights";
import type { SaintBrief } from "@/lib/saints/brief";
import type { StripDay } from "@/lib/streak/compute";
import type { StreakView } from "@/lib/streak/useStreak";

import type { WidgetEntries } from "./bridge";
import type { WidgetLabels } from "./labels";

/**
 * What the app hands the home screen widgets, worked out from what the app
 * holds (docs/WIDGETS.md, section 2): one entry per key, each a string the
 * plugin keeps as it is, JSON already stringified.
 *
 * Plain functions over what the caller reads (the streak store, the prayer
 * ledger, the calendar setting, the patron the server named), so each is
 * tested without a phone. components/native/WidgetBridgeSync.tsx reads those
 * things and loads this file only when the apps push, because the icons'
 * rights record it needs is large and the website never pushes at all.
 *
 * An entry is a string to keep, null to forget, or undefined to leave as the
 * phone has it. Undefined is for what the app does not know at that moment,
 * such as the patron when the server could not be asked: the widget keeps
 * showing what it showed rather than the reader seeming to have no saint.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DAY_MS = 86_400_000;

/** A day key at noon UTC, the frame lib/rhythm/dayKey.ts keeps days in. */
function noonOf(day: DayKey): Date {
  return new Date(`${day}T12:00:00Z`);
}

/** Whether a key names a day the calendar has: 2026-02-30 does not. */
function realDay(day: unknown): day is DayKey {
  return typeof day === "string" && DAY.test(day) && keyOf(noonOf(day)) === day;
}

// ── The calendar ────────────────────────────────────────────────────────────

/** The reader's reckoning, which side of the day table a widget reads. */
export function calendarStyleEntry(style: unknown): "new" | "old" {
  return style === "old" ? "old" : "new";
}

// ── The streak ──────────────────────────────────────────────────────────────

export type StreakFacts = Pick<StreakView, "ready" | "current" | "keptToday" | "strip">;

/**
 * The streak as the app shows it (lib/streak/useStreak.ts): the count, whether
 * today is kept, the last seven days oldest first, each kept or not (a day a
 * save held counts as kept, as the strip draws it), and the day it was true
 * on, so a widget drawn on a later day knows it is looking at an old answer.
 * Undefined until the store has an answer.
 */
export function streakEntry(view: StreakFacts | null | undefined, today: DayKey): string | undefined {
  if (!view?.ready || !realDay(today)) return undefined;
  const kept = (day: StripDay) => day.state === "kept" || day.state === "saved";
  const week = view.strip.slice(-7).map(kept);
  while (week.length < 7) week.unshift(false);
  const count = Number.isFinite(view.current) && view.current > 0 ? Math.floor(view.current) : 0;
  return JSON.stringify({ count, keptToday: view.keptToday === true, week, on: today });
}

// ── The prayers ─────────────────────────────────────────────────────────────

/**
 * The two rules Pray now offers, by the ids their marks are kept under
 * (lib/prayers/storage.ts: purify.prayers.morning.dates and .evening.dates).
 * The rule's reader and the prayer strand on Today both file there.
 */
export const PRAYED_RULES = { morning: "morning", evening: "evening" } as const satisfies Record<HourRuleId, string>;

/** The latest day a rule was finished, up to today. A day ahead (a clock elsewhere) is not today's. */
function lastPrayed(dates: readonly unknown[], today: DayKey): DayKey | null {
  let last: DayKey | null = null;
  for (const day of dates) {
    if (realDay(day) && day <= today && (last === null || day > last)) last = day;
  }
  return last;
}

/** When each rule was last finished, for "Prayed today" on the Pray now widget. */
export function prayedEntry(morning: readonly unknown[], evening: readonly unknown[], today: DayKey): string {
  return JSON.stringify({ morning: lastPrayed(morning, today), evening: lastPrayed(evening, today) });
}

// ── The patron saint ────────────────────────────────────────────────────────

/** What the server said of the reader's patron saint (/api/profile/patron-saint). */
export type PatronAnswer = { kind: "saint"; slug: string } | { kind: "none" } | { kind: "unknown" };

/**
 * Read the server's answer. Signed out (401) and no saint chosen are both
 * "none": the widget asks the reader to choose one. Anything else that is not
 * a plain answer, an error page or no answer at all, is "unknown", and the
 * widget keeps what it had.
 */
export function readPatronAnswer(status: number | null | undefined, body: unknown): PatronAnswer {
  if (status === 401) return { kind: "none" };
  if (status !== 200 || !body || typeof body !== "object") return { kind: "unknown" };
  const slug = (body as { slug?: unknown }).slug;
  if (slug === null) return { kind: "none" };
  return typeof slug === "string" && SLUG.test(slug) ? { kind: "saint", slug } : { kind: "unknown" };
}

export type PatronFacts = {
  slug: string;
  /** English, as every saint's name is in every language of the app. */
  name: string;
  /** The next name day on the reader's own calendar, YYYY-MM-DD. */
  nameDay: DayKey | null;
  /** Days from today to it, 0 on the day. For the label, never sent. */
  daysToNameDay: number | null;
  /** The icon's place in the app's bundle, only when its rights are cleared. */
  icon: string | null;
};

const SAINTS = profiledSaints as SaintBrief[];

/**
 * The icon a widget may draw: only a file whose rights are settled in
 * lib/saints/iconRights.ts, as the path the app's bundle carries it at
 * (Android reads its assets from public/). Otherwise null, and the widget
 * draws the saint's name alone.
 */
function iconOf(iconUrl: string | undefined): string | null {
  if (!iconUrl?.startsWith(ICONS_URL_PREFIX) || !iconRightsFor(iconUrl)) return null;
  return `public${iconUrl}`;
}

/**
 * The patron as a widget shows it: the saint in brief
 * (data/calendar/profiled-saints.json) and the next name day, on the
 * reader's calendar, worked out the way the Discord status works it out
 * (lib/desktop/presenceModes.ts, nextNameDay): the principal feast, thirteen
 * days later by the civil date on the Old Calendar.
 *
 * Undefined while the answer is unknown, null when there is no saint to show:
 * none chosen, or one this build of the app does not have.
 */
export function patronFacts(answer: PatronAnswer, today: DayKey, style: unknown): PatronFacts | null | undefined {
  if (answer.kind === "unknown") return undefined;
  if (answer.kind === "none" || !realDay(today)) return null;
  const saint = SAINTS.find((s) => s.slug === answer.slug);
  if (!saint) return null;
  const next = nextNameDay(saint.feastDays, noonOf(today), calendarStyleEntry(style), keyOf);
  const nameDay = next && realDay(next.date) ? next.date : null;
  return {
    slug: saint.slug,
    name: saint.name,
    nameDay,
    daysToNameDay: nameDay ? Math.round((noonOf(nameDay).getTime() - noonOf(today).getTime()) / DAY_MS) : null,
    icon: iconOf(saint.iconUrl),
  };
}

/** The patron entry: the saint, null to forget one, or undefined to leave it be. */
export function patronEntry(facts: PatronFacts | null | undefined): string | null | undefined {
  if (facts === undefined) return undefined;
  if (facts === null) return null;
  const { slug, name, nameDay, icon } = facts;
  return JSON.stringify({ slug, name, nameDay, icon });
}

// ── The next update ─────────────────────────────────────────────────────────

/** A line of text that fits on a widget, or null. */
function line(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

/**
 * The next Purify update for the countdown: data/changelog/next-update.json,
 * each field null until the owner sets the next update. `raw` is for the
 * content packs, once they carry the date, so a moved date reaches the
 * widgets without a store build; until then the committed file is the word.
 */
export function updateEntry(raw: unknown = nextUpdate): string {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return JSON.stringify({
    name: line(o.name, 60),
    version: line(o.version, 20),
    date: realDay(o.date) ? o.date : null,
  });
}

// ── Everything at once ──────────────────────────────────────────────────────

export type WidgetState = {
  /** The reader's civil day, from todayKey(). */
  today: DayKey;
  calendarStyle: unknown;
  labels: WidgetLabels | null;
  streak: StreakFacts | null;
  prayed: { morning: readonly unknown[]; evening: readonly unknown[] };
  /** From patronFacts: undefined while unknown. */
  patron: PatronFacts | null | undefined;
  /** The packs' word on the next update, once they carry one. */
  update?: unknown;
};

/** Every entry the plugin takes, from the app's state. */
export function widgetEntries(state: WidgetState): WidgetEntries {
  return {
    calendarStyle: calendarStyleEntry(state.calendarStyle),
    labels: state.labels ? JSON.stringify(state.labels) : undefined,
    streak: streakEntry(state.streak, state.today),
    prayed: realDay(state.today) ? prayedEntry(state.prayed.morning, state.prayed.evening, state.today) : undefined,
    patron: patronEntry(state.patron),
    update: updateEntry(state.update ?? nextUpdate),
  };
}
