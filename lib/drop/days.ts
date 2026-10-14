/**
 * The drop day, and the Church's year it is planned against.
 *
 * A release is told on a day the owner chooses, and the Church's year gives
 * the natural ones: a drop a few days before a great feast, or before a fast
 * begins, reaches people when they are already turning to their prayers.
 * `node scripts/drop.mjs days` lists the next of them with a suggested drop
 * day for each, and `node scripts/drop.mjs day <release> <day>` writes the
 * one he picks into drop.json.
 *
 * The dates are the app's own. Pascha is lib/calendar/pascha.ts, and Great
 * Lent and Pentecost are counted from it with the same days
 * lib/calendar/orthodox.ts counts (Clean Monday 48 before, Pentecost 49
 * after); lib/drop/__tests__/days.test.ts holds the two to each other. The
 * fixed feasts are on the New Calendar, as the rest of the app keeps them.
 *
 * A day is a plain "2026-11-12": compared as text, and made into a Date only
 * at noon UTC, so no time zone can move it to the day before.
 *
 * Pure, and loadable by plain Node for scripts/drop.mjs: its one import goes
 * through the "@/" alias (scripts/lib/alias-hooks.mjs), and that file has no
 * imports of its own. The import of ./kit is a type and is gone at run time.
 */

import { orthodoxPascha } from "@/lib/calendar/pascha";

import type { Moment } from "./kit";

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS = 86_400_000;

/** True for a day that exists, written as 2026-11-12. Never 2026-02-30, never "next week". */
export function isDay(text: unknown): text is string {
  if (typeof text !== "string") return false;
  const parts = DAY.exec(text);
  if (!parts) return false;
  const [y, m, d] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  const at = new Date(Date.UTC(y, m - 1, d, 12));
  return at.getUTCFullYear() === y && at.getUTCMonth() === m - 1 && at.getUTCDate() === d;
}

function noon(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

const dayOf = (at: Date) => at.toISOString().slice(0, 10);

export function addDays(day: string, n: number): string {
  return dayOf(new Date(noon(day).getTime() + n * MS));
}

/** Whole days from one day to another: 1 when `to` is the day after, below 0 when it has gone by. */
export function daysBetween(from: string, to: string): number {
  return Math.round((noon(to).getTime() - noon(from).getTime()) / MS);
}

/** The day it is on this computer's own calendar, which is the owner's. */
export function localDay(at: Date = new Date()): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Thu 12 Nov 2026". Built from the parts, so it reads the same on every machine. */
export function longDay(day: string): string {
  const at = noon(day);
  return `${WEEKDAYS[at.getUTCDay()]} ${at.getUTCDate()} ${MONTHS[at.getUTCMonth()]} ${at.getUTCFullYear()}`;
}

/** "Thu 12 Nov", for a line that already says the year. */
export function shortDay(day: string): string {
  return longDay(day).replace(/ \d{4}$/, "");
}

/** How far off a day is, said after a colon: "29 days to go", "the day itself", "2 days ago". */
export function countdown(day: string, today: string): string {
  const n = daysBetween(today, day);
  if (n === 0) return "the day itself";
  if (n > 0) return n === 1 ? "1 day to go" : `${n} days to go`;
  return n === -1 ? "1 day ago" : `${-n} days ago`;
}

// ---------------------------------------------------------------- the Church's year

export type Occasion = {
  key: string;
  /** As it reads at the start of a line: "The Nativity Fast begins". */
  name: string;
  /** The month and day on the New Calendar, or the days from Pascha. */
  on: { month: number; day: number } | { fromPascha: number };
};

/** The days lib/calendar/orthodox.ts hangs off Pascha for Clean Monday and Pentecost. */
const CLEAN_MONDAY = -48;
const PENTECOST = 49;

/** The occasions a drop is planned against, in the order of the Church's year from the autumn. */
export const OCCASIONS: readonly Occasion[] = [
  { key: "nativity-fast", name: "The Nativity Fast begins", on: { month: 11, day: 15 } },
  { key: "nativity", name: "Nativity", on: { month: 12, day: 25 } },
  { key: "theophany", name: "Theophany", on: { month: 1, day: 6 } },
  { key: "great-lent", name: "Great Lent begins", on: { fromPascha: CLEAN_MONDAY } },
  { key: "pascha", name: "Pascha", on: { fromPascha: 0 } },
  { key: "pentecost", name: "Pentecost", on: { fromPascha: PENTECOST } },
  { key: "dormition", name: "The Dormition", on: { month: 8, day: 15 } },
  { key: "church-new-year", name: "The Church New Year", on: { month: 9, day: 1 } },
  { key: "elevation", name: "The Elevation of the Cross", on: { month: 9, day: 14 } },
];

/** The day an occasion falls on in a given year. */
export function occasionDay(occasion: Occasion, year: number): string {
  if ("fromPascha" in occasion.on) return addDays(dayOf(orthodoxPascha(year)), occasion.on.fromPascha);
  return dayOf(new Date(Date.UTC(year, occasion.on.month - 1, occasion.on.day, 12)));
}

/** Three days ahead: the release is out and settled before the day itself. */
export const DAYS_BEFORE = 3;

export type DropDay = { occasion: Occasion; on: string; drop: string };

/** The next occasions from a day on, soonest first, each with the day to drop for it. */
export function dropDays(from: string, count: number = OCCASIONS.length, before: number = DAYS_BEFORE): DropDay[] {
  const first = Number(from.slice(0, 4));
  const years = Math.ceil(count / OCCASIONS.length) + 1;
  const all: DropDay[] = [];
  for (let year = first; year <= first + years; year++) {
    for (const occasion of OCCASIONS) {
      const on = occasionDay(occasion, year);
      if (on >= from) all.push({ occasion, on, drop: addDays(on, -before) });
    }
  }
  return all.sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0)).slice(0, count);
}

// ---------------------------------------------------------------- what is due by when

/**
 * When each moment of a drop is due, counted in days from the drop day: the
 * day the announcement goes out. A store can take a week to review a build,
 * so the notes are accepted, the builds walked on a phone and both submitted
 * a week ahead. The store-day pieces follow each store from the day itself,
 * what comes after waits for the phones to update, and the numbers wait for
 * the first week to be over.
 */
export const MOMENT_DUE: Readonly<Record<Moment, { days: number; word: "By" | "On" | "From" }>> = {
  ready: { days: -7, word: "By" },
  submit: { days: -7, word: "By" },
  web: { days: 0, word: "On" },
  stores: { days: 0, word: "From" },
  after: { days: 3, word: "From" },
  numbers: { days: 7, word: "From" },
};

export type Due = { moment: Moment; word: "By" | "On" | "From"; on: string };

/** What is due by when, for a drop day, in the order of the moments. */
export function dueDays(day: string): Due[] {
  return (Object.keys(MOMENT_DUE) as Moment[]).map((moment) => ({ moment, word: MOMENT_DUE[moment].word, on: addDays(day, MOMENT_DUE[moment].days) }));
}
