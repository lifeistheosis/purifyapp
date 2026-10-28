// What the screens count, as closed lists (1.8). The owner, 2026-10-28: "a
// retention-based system, so we know which screens they close the app, leave,
// whatever".
//
// The page views the site already keeps say where a visit ended. Two things
// they cannot say are counted here, the way the onboarding counts its own
// (lib/onboarding/counting.ts): totals in analytics_events, sent through
// /api/track/event, with no session, no account, no device id and no address,
// and kept to the day, not the time.
//
//   screen_closed  the app was put away or the page closed: which kind of
//                  screen was showing (a word from lib/analytics/screens.ts)
//                  and roughly how long it had been showing.
//   first_open     a device opened Purify for the first time.
//   came_back      that device came back a day, a week or a month later. The
//                  device keeps the day it first opened (VisitRecord) and
//                  says so once for each; the server never joins two visits.
//
// Each carries the kind of device (iPhone, Android, Windows, website), so the
// admin can tell the apps from the website. Nothing else: the server takes
// nothing that is not on these lists (lib/security/schemas.ts).
//
// Pure, so the rules are tested directly (lib/analytics/__tests__/screenCounting.test.ts).
// Sending is lib/analytics/screenCount.ts.

import { daysBetween, type CountPlatform } from "@/lib/onboarding/counting";

import type { ScreenKey } from "./screens";

export const SCREEN_EVENTS = ["screen_closed", "first_open", "came_back"] as const;
export type ScreenEventName = (typeof SCREEN_EVENTS)[number];

export function isScreenEvent(name: string): name is ScreenEventName {
  return (SCREEN_EVENTS as readonly string[]).includes(name);
}

/** How long a screen had been showing when the app was put away, in four spans. */
export const OPEN_SPANS = ["under-10s", "10s-1m", "1m-5m", "over-5m"] as const;
export type OpenSpan = (typeof OPEN_SPANS)[number];

export function openSpan(ms: number): OpenSpan {
  if (!(ms >= 10_000)) return "under-10s";
  if (ms < 60_000) return "10s-1m";
  if (ms < 300_000) return "1m-5m";
  return "over-5m";
}

/** The days after the first open on which coming back is counted. */
export const CAME_BACK_DAYS = [1, 7, 30] as const;
export type CameBackDay = (typeof CAME_BACK_DAYS)[number];

/**
 * What a device keeps about itself, so that it can say it came back without
 * the server joining two visits. Kept on the device only.
 */
export type VisitRecord = {
  /** The day this device first opened Purify, YYYY-MM-DD in UTC. */
  at: string;
  /** The days already counted. */
  sent: CameBackDay[];
  /**
   * The device had used Purify before this counting began, so its first open
   * is not known and it counts nothing.
   */
  before?: true;
};

/**
 * The days to count now: every one reached and not yet sent. A device that
 * first comes back on day 9 is counted for day 1 and day 7 at once, so the
 * totals read "came back a day or more later", "a week or more later", the
 * onboarding's rule (lib/onboarding/counting.ts, returnsDue).
 */
export function cameBackDue(record: VisitRecord, today: string): CameBackDay[] {
  if (record.before) return [];
  const days = daysBetween(record.at, today);
  return CAME_BACK_DAYS.filter((d) => days >= d && !record.sent.includes(d));
}

/** A record read back from storage, or null when it is not one. */
export function parseVisitRecord(raw: string | null): VisitRecord | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<VisitRecord> | null;
    if (!r || typeof r.at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.at)) return null;
    const sent = Array.isArray(r.sent)
      ? r.sent.filter((d): d is CameBackDay => (CAME_BACK_DAYS as readonly number[]).includes(d))
      : [];
    return { at: r.at, sent, ...(r.before === true ? { before: true as const } : {}) };
  } catch {
    return null;
  }
}

export type ScreenEvent =
  | { name: "screen_closed"; props: { screen: ScreenKey; open: OpenSpan } }
  | { name: "first_open"; props: Record<string, never> }
  | { name: "came_back"; props: { day: CameBackDay } };

/**
 * The body the device sends: the event and the kind of device, nothing else.
 * One function for the device and its test, so what is sent is exactly what
 * the server's closed list is tested to take.
 */
export function screenEventBody(event: ScreenEvent, platform: CountPlatform): string {
  return JSON.stringify({ name: event.name, props: { ...event.props, platform } });
}
