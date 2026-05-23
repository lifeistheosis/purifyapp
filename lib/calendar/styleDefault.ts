// Persisted user preference for the calendar reckoning ("new" or "old").
// Written by ProfileSettings, read by the calendar page when no explicit
// `?style=` query parameter is present.
//
// Lives in localStorage so it works without an account; signed-in users
// see it follow them across devices via the cookie session.
//
// This file is intentionally hook-free so it can be imported from server
// components (e.g. the calendar page's cookie-fallback path). The React
// hook that subscribes to the in-tab event lives next door in
// `useCalendarStyleDefault.ts` (`"use client"`).

export const CALENDAR_STYLE_KEY = "purify:calendar.style";

/** Custom event fired in-tab when the preference changes, so subscribers
 *  refresh without waiting for the cross-tab `storage` event. */
export const CALENDAR_STYLE_EVENT = "purify:calendar.style";

export type CalendarStyleDefault = "new" | "old";

export function readCalendarStyleDefault(): CalendarStyleDefault {
  if (typeof window === "undefined") return "new";
  try {
    const v = window.localStorage.getItem(CALENDAR_STYLE_KEY);
    return v === "old" ? "old" : "new";
  } catch {
    return "new";
  }
}

export function writeCalendarStyleDefault(v: CalendarStyleDefault): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CALENDAR_STYLE_KEY, v);
  } catch {
    /* ignore */
  }
  // Mirror into a cookie so the server-rendered calendar page can read
  // the preference without a flash of wrong content.
  try {
    document.cookie = `${CALENDAR_STYLE_COOKIE}=${v}; Max-Age=31536000; Path=/; SameSite=Lax`;
  } catch {
    /* ignore */
  }
  // In-tab subscribers (the useCalendarStyleDefault hook) listen for this
  // event so they refresh without waiting on the cross-tab `storage` event.
  try {
    window.dispatchEvent(new CustomEvent(CALENDAR_STYLE_EVENT));
  } catch {
    /* ignore */
  }
}

export const CALENDAR_STYLE_COOKIE = "purify_calendar_style";
