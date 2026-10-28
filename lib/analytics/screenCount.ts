// Sending the screens' counts (1.8): fire and forget, never in the way.
//
// What is counted and why is ./screenCounting.ts. This file only sends, and
// decides when not to, on the onboarding's rules (lib/onboarding/count.ts):
// automation counts nothing, and a device the admin has been opened on counts
// nothing, so the owner's own use never lands in the totals. The visit
// tracker (components/analytics/AnalyticsTracker.tsx) calls in only for a tab
// that has had a person's input, the rule its page views follow.
//
// Sent with a plain fetch and no credentials, not apiFetch: a count carries no
// cookie and no sign-in, and a close is sent as the app goes into the
// background, where waiting for the sign-in to be read first could mean it is
// never sent. The apps reach purifyapp.net the way apiFetch would
// (lib/api/client.ts); /api/track/event answers their preflight.

import { countPlatform, countingAllowed } from "@/lib/onboarding/count";
import { utcDay } from "@/lib/onboarding/counting";
import { priorUseDetected } from "@/lib/onboarding/state";
import { isNativeClient } from "@/lib/platform/native";
import { SITE_URL } from "@/lib/site";

import {
  cameBackDue,
  openSpan,
  parseVisitRecord,
  screenEventBody,
  type ScreenEvent,
  type VisitRecord,
} from "./screenCounting";
import type { ScreenKey } from "./screens";

const VISIT_KEY = "purify:visits.counted";
// Written once a reader has finished (or been excused from) the welcome
// questions (lib/onboarding/state.ts). Every device that used Purify before
// 28 September has it.
const ONBOARDED_KEY = "purify:onboarded";

/**
 * Had this device used Purify before? Asked once, as this file is first read,
 * which is before any page has run and written notes of its own: a reader
 * whose first page is a Bible chapter has a reading note a moment later, and
 * asked then, a new device would look like an old one. A device that had
 * would never know its first open, so it counts no first open and no return.
 */
const USED_BEFORE: boolean = (() => {
  if (typeof window === "undefined") return true;
  try {
    return priorUseDetected() || window.localStorage.getItem(ONBOARDED_KEY) !== null;
  } catch {
    return true;
  }
})();

function send(event: ScreenEvent): void {
  if (!countingAllowed()) return;
  const url = isNativeClient() ? `${SITE_URL}/api/track/event` : "/api/track/event";
  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: screenEventBody(event, countPlatform()),
      credentials: "omit",
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* a page on its way out may refuse a new request: the count is lost, nothing else */
  }
}

/** The app was put away, or the page closed, on this screen after this long. */
export function countClose(screen: ScreenKey, shownMs: number): void {
  send({ name: "screen_closed", props: { screen, open: openSpan(shownMs) } });
}

function readRecord(): VisitRecord | null {
  try {
    return parseVisitRecord(window.localStorage.getItem(VISIT_KEY));
  } catch {
    return null;
  }
}

function keep(record: VisitRecord): boolean {
  try {
    window.localStorage.setItem(VISIT_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/**
 * On a page load and on every return to the app: a device's first open, or
 * its coming back a day, a week or a month after it, each said once.
 */
export function countVisit(): void {
  if (!countingAllowed()) return;
  const today = utcDay(new Date());
  const record = readRecord();
  if (!record) {
    const first: VisitRecord = USED_BEFORE ? { at: today, sent: [], before: true } : { at: today, sent: [] };
    // Kept before it is sent: a device that cannot keep the day says nothing,
    // rather than a first open on every visit.
    if (keep(first) && !first.before) send({ name: "first_open", props: {} });
    return;
  }
  const due = cameBackDue(record, today);
  if (!due.length) return;
  if (!keep({ ...record, sent: [...record.sent, ...due] })) return;
  for (const day of due) send({ name: "came_back", props: { day } });
}
