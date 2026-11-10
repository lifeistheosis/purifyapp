// The campaigns a reader carries in their own prayers (1.9.1), kept on the
// device as the names from the prayer wall are (lib/prayers/wallNames.ts).
//
// Joining a campaign is "Add to my prayers": its name goes into "Those I
// pray for", in the prayers the reader ticks, until the campaign's last day
// or a sooner day of the reader's own (his yes to item 120). It needs no
// account, and nothing is sent when it is prayed: the prayer reader reads
// only this list.
//
//   purify.prayers.campaigns    JSON CarriedCampaign[]    on this device
//
// What is kept is what the campaign's page showed: its id, the name it prays
// for, its title, whether it is for the living or the reposed, the prayer it
// names (by reference, never its words), the prayers it waits in, and the
// days. Signed in, the reader's choice also rides on their own join row
// (prayer_campaign_prayers), so it follows them to another device.
//
// How it leaves (docs/1.9-build/notes/campaigns-fable.md, 2.3):
//   - the day after its last day, or the reader's own sooner day, by the
//     device's own calendar;
//   - at once when the reader takes it out;
//   - when its creator ends it or a moderator removes it, the next time the
//     app is online and asks (settleCarried).
// One that has left is kept, marked, for a while: so a sync from another
// device cannot bring it back, and so the page of Your rule can ask once
// whether to keep the name.
//
// This file is the model, pure and safe on the server. Reading and keeping
// it on the device is ./useCarried.ts.

import { cleanPlaces, placeOf, type PrayPlace } from "@/lib/prayers/commemoration";

import { addDays, campaignPsalm, isDay, NAME_MAX, TITLE_MAX, type ForWhom, type PrayerRef } from "./model";

/** Why a campaign left the reader's prayers. */
export type LeftWhy =
  /** The reader took it out. */
  | "out"
  /** Its days, or the reader's own, were over. */
  | "over"
  /** Its creator closed it early. */
  | "ended"
  /** It was taken down. */
  | "removed";

export type CarriedCampaign = {
  /** The campaign's id. */
  id: string;
  /** Who it prays for, as its page showed. */
  name: string;
  title: string;
  forWhom: ForWhom;
  /** The prayer of the book it names, or null. */
  prayer: PrayerRef | null;
  /** The prayers it waits in: at least one. */
  places: PrayPlace[];
  /** The campaign's own last day. */
  lastDay: string;
  /** The last day it stands in this reader's prayers: the campaign's, or sooner. */
  until: string;
  addedAt: string;
  /** When it left, or null while it is carried. */
  leftAt: string | null;
  left: LeftWhy | null;
  /** "Keep this name?" has been answered, or never needs asking. */
  asked: boolean;
  /** The last change, so the latest wins when two devices disagree. */
  changedAt: string;
};

export const CARRIED_KEY = "purify.prayers.campaigns";
export const CARRIED_EVENT = "purify:prayer-campaigns";

/** At most this many at once: a few names carried, not a second board. */
export const CARRIED_CAP = 24;
/** One that has left is forgotten this many days after. */
export const LEFT_KEPT_DAYS = 45;

/** How long a reader may carry it (his yes to item 120). */
export type CarryFor = "whole" | "week" | "today";
export const CARRY_FOR: readonly CarryFor[] = ["whole", "week", "today"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 86_400_000;

function clip(s: unknown, max: number): string | null {
  if (typeof s !== "string") return null;
  const one = s.replace(/\s+/g, " ").trim();
  return one ? [...one].slice(0, max).join("").trim() : null;
}

function iso(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

const WHYS: readonly LeftWhy[] = ["out", "over", "ended", "removed"];

function parseOne(x: unknown): CarriedCampaign | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const id = typeof o.id === "string" && UUID.test(o.id) ? o.id.toLowerCase() : null;
  const name = clip(o.name, NAME_MAX);
  const title = clip(o.title, TITLE_MAX);
  const places = cleanPlaces(o.places);
  const addedAt = iso(o.addedAt);
  if (!id || !name || !title || !places || places.length === 0 || !addedAt || !isDay(o.lastDay) || !isDay(o.until)) return null;
  const leftAt = o.leftAt == null ? null : iso(o.leftAt);
  const left = leftAt && WHYS.includes(o.left as LeftWhy) ? (o.left as LeftWhy) : leftAt ? "out" : null;
  const prayer = campaignPsalm(o.prayer as { rule?: unknown; id?: unknown } | null);
  return {
    id,
    name,
    title,
    forWhom: o.forWhom === "departed" ? "departed" : "living",
    prayer: prayer ? { rule: prayer.rule, id: prayer.id } : null,
    places,
    lastDay: o.lastDay,
    // Never past the campaign's own last day.
    until: o.until > o.lastDay ? o.lastDay : o.until,
    addedAt,
    leftAt,
    left,
    asked: o.asked === true,
    changedAt: iso(o.changedAt) ?? addedAt,
  };
}

/**
 * Well formed, each once (the latest change winning), those carried before
 * those that have left, the first to leave first, at most the cap; one that
 * left long ago is forgotten.
 */
export function cleanCarried(list: readonly unknown[], now: number = Date.now()): CarriedCampaign[] {
  const byId = new Map<string, CarriedCampaign>();
  for (const x of list) {
    const c = parseOne(x);
    if (!c) continue;
    if (c.leftAt && Date.parse(c.leftAt) < now - LEFT_KEPT_DAYS * DAY_MS) continue;
    const had = byId.get(c.id);
    if (!had || Date.parse(c.changedAt) > Date.parse(had.changedAt)) byId.set(c.id, c);
  }
  return [...byId.values()]
    .sort((a, b) => Number(Boolean(a.leftAt)) - Number(Boolean(b.leftAt)) || a.until.localeCompare(b.until) || a.addedAt.localeCompare(b.addedAt))
    .slice(0, CARRIED_CAP);
}

/** The stored list, as cleanCarried keeps it. */
export function parseCarried(raw: string | null, now: number = Date.now()): CarriedCampaign[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  return cleanCarried(Array.isArray(parsed) ? parsed : [], now);
}

/**
 * The last day a reader carries it for a choice made on `today`: the
 * campaign's own last day, a week counting today, or today alone. Never past
 * the campaign's own.
 */
export function untilFor(choice: CarryFor, lastDay: string, today: string): string {
  const own = choice === "today" ? today : choice === "week" ? addDays(today, 6) : lastDay;
  return own > lastDay ? lastDay : own;
}

/** Which choice a kept day is, for the sheet opened again. */
export function carryForOf(c: Pick<CarriedCampaign, "until" | "lastDay">, today: string): CarryFor {
  if (c.until >= c.lastDay) return "whole";
  return c.until <= today ? "today" : "week";
}

/** What Add to my prayers carries from a campaign's page. */
export type CarryPick = {
  id: string;
  name: string;
  title: string;
  forWhom: ForWhom;
  prayer: PrayerRef | null;
  lastDay: string;
};

/**
 * Carry a campaign, or carry it again: in the prayers chosen, until the day
 * chosen. Nothing is added with no prayer to wait in, or once its last day
 * has passed.
 */
export function carry(
  list: readonly CarriedCampaign[],
  pick: CarryPick,
  places: readonly PrayPlace[],
  until: string,
  today: string,
  now: Date = new Date(),
): CarriedCampaign[] {
  const chosen = cleanPlaces([...places]) ?? [];
  const name = clip(pick.name, NAME_MAX);
  const title = clip(pick.title, TITLE_MAX);
  if (!UUID.test(pick.id) || !name || !title || chosen.length === 0 || !isDay(pick.lastDay) || !isDay(until) || !isDay(today)) return [...list];
  if (pick.lastDay < today) return [...list];
  const at = now.toISOString();
  const prayer = campaignPsalm(pick.prayer);
  const next: CarriedCampaign = {
    id: pick.id.toLowerCase(),
    name,
    title,
    forWhom: pick.forWhom,
    prayer: prayer ? { rule: prayer.rule, id: prayer.id } : null,
    places: chosen,
    lastDay: pick.lastDay,
    until: until > pick.lastDay ? pick.lastDay : until < today ? today : until,
    addedAt: at,
    leftAt: null,
    left: null,
    asked: false,
    changedAt: at,
  };
  return cleanCarried([next, ...list.filter((c) => c.id !== next.id)], now.getTime());
}

/** Wait in other prayers, or until another day; it stays carried. */
export function recarry(
  list: readonly CarriedCampaign[],
  id: string,
  places: readonly PrayPlace[],
  until: string,
  now: Date = new Date(),
): CarriedCampaign[] {
  const chosen = cleanPlaces([...places]) ?? [];
  if (chosen.length === 0 || !isDay(until)) return [...list];
  const at = now.toISOString();
  return list.map((c) => {
    if (c.id !== id || c.leftAt) return c;
    const day = until > c.lastDay ? c.lastDay : until;
    return c.places.join() === chosen.join() && c.until === day ? c : { ...c, places: chosen, until: day, changedAt: at };
  });
}

function leave(c: CarriedCampaign, why: LeftWhy, at: string): CarriedCampaign {
  // Taken out by the reader's own hand, or taken down: there is nothing to ask.
  return { ...c, leftAt: at, left: why, asked: c.asked || why === "out" || why === "removed", changedAt: at };
}

/** The reader takes it out of their prayers. */
export function takeOut(list: readonly CarriedCampaign[], id: string, now: Date = new Date()): CarriedCampaign[] {
  const at = now.toISOString();
  return list.map((c) => (c.id === id && !c.leftAt ? leave(c, "out", at) : c));
}

/** Those whose day has passed leave: `today` is the reader's own calendar day. */
export function expireCarried(list: readonly CarriedCampaign[], today: string, now: Date = new Date()): CarriedCampaign[] {
  const at = now.toISOString();
  let changed = false;
  const next = list.map((c) => {
    if (c.leftAt || c.until >= today) return c;
    changed = true;
    return leave(c, "over", at);
  });
  return changed ? next : (list as CarriedCampaign[]);
}

/** What the server says of a campaign the device carries (app/api/campaigns/state). */
export type CampaignState = "running" | "over" | "gone";

/** Let go of those the server says are over or gone. The same list back when nothing changed. */
export function settleCarried(
  list: readonly CarriedCampaign[],
  states: Readonly<Record<string, CampaignState | undefined>>,
  now: Date = new Date(),
): CarriedCampaign[] {
  const at = now.toISOString();
  let changed = false;
  const next = list.map((c) => {
    const s = states[c.id];
    if (c.leftAt || !s || s === "running") return c;
    changed = true;
    return leave(c, s === "gone" ? "removed" : "ended", at);
  });
  return changed ? next : (list as CarriedCampaign[]);
}

/** Those carried today, the newest first (carry() sets each at the head). */
export function carriedNow(list: readonly CarriedCampaign[], today: string): CarriedCampaign[] {
  return list.filter((c) => !c.leftAt && c.until >= today);
}

/** The campaign as the reader carries it today, or null. */
export function carriedOne(list: readonly CarriedCampaign[], id: string, today: string): CarriedCampaign | null {
  return carriedNow(list, today).find((c) => c.id === id.toLowerCase()) ?? null;
}

/** Those a rule carries today, in the order they were added. */
export function carriedFor(list: readonly CarriedCampaign[], ruleId: string, today: string): CarriedCampaign[] {
  const place = placeOf(ruleId);
  if (!place) return [];
  return carriedNow(list, today)
    .filter((c) => c.places.includes(place))
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

/**
 * Those that ran their course and wait for one answer: "Keep this name among
 * those you pray for?" Never for one the reader took out or that was taken
 * down.
 */
export function toAsk(list: readonly CarriedCampaign[]): CarriedCampaign[] {
  return list.filter((c) => c.leftAt && !c.asked && (c.left === "over" || c.left === "ended"));
}

/** The question has been answered, either way. */
export function answered(list: readonly CarriedCampaign[], id: string, now: Date = new Date()): CarriedCampaign[] {
  const at = now.toISOString();
  return list.map((c) => (c.id === id && !c.asked ? { ...c, asked: true, changedAt: at } : c));
}

/** The ids the device asks the server about: every one still carried. */
export function idsToSettle(list: readonly CarriedCampaign[]): string[] {
  return list.filter((c) => !c.leftAt).map((c) => c.id);
}

/**
 * This device's list and the account's (the reader's own join rows, with
 * what each campaign's page shows), each once. A campaign the account
 * carries and this device has never seen is added; one this device has
 * (carried or left) is this device's to say, so taking one out here is not
 * undone by a row that has not caught up.
 */
export function mergeCarried(
  local: readonly CarriedCampaign[],
  account: readonly { pick: CarryPick; places: readonly PrayPlace[]; until: string | null }[],
  today: string,
  now: Date = new Date(),
): CarriedCampaign[] {
  let list = [...local];
  const have = new Set(local.map((c) => c.id));
  for (const row of account) {
    const id = row.pick.id.toLowerCase();
    if (have.has(id)) continue;
    const until = row.until && isDay(row.until) ? row.until : row.pick.lastDay;
    if (until < today) continue;
    list = carry(list, row.pick, row.places, until, today, now);
    have.add(id);
  }
  return list.length === local.length ? (local as CarriedCampaign[]) : list;
}
