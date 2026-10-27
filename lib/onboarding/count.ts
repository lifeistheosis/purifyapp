// Sending the onboarding's counts (1.8): fire and forget, never in the way.
//
// What is counted and why is lib/onboarding/counting.ts. This file only
// sends, through apiFetch so the apps reach purifyapp.net (the same road the
// catechism's events take, components/catechism/events.ts), and decides when
// not to:
//
//   - a browser that is automation (a test run, a crawler) counts nothing;
//   - a device that has opened the admin counts nothing, so the owner's own
//     walks through the questions never land in the totals
//     (components/admin/AdminShell.tsx marks it);
//   - within one run of the questions, a screen or a question counts once,
//     so going back and forward is not a second reader.
//
// Coming back is counted by the device itself: the flow it finished is kept
// here (FinishedRecord), and on its day 2, 7 and 30 it says so once, with the
// answers it gave. The server never joins two visits.

import { apiFetch } from "@/lib/api/client";
import { isAutomatedAgent } from "@/lib/analytics/bot";
import { cleanTag } from "@/lib/analytics/tag";
import { isDesktopApp } from "@/lib/desktop/bridge";
import { nativePlatform } from "@/lib/platform/native";
import {
  COUNT_VERSION,
  eventBody,
  parseFinishedRecord,
  returnsDue,
  utcDay,
  type CountPlatform,
  type CountQuestion,
  type CountRoute,
  type CountStep,
  type FinishedRecord,
} from "./counting";
import type { Background, DayOneKey, Intent, Level } from "./space";

const OFF_KEY = "purify:count.off";
const FINISHED_KEY = "purify:onboarding.counted";
// The link tag the visit came by, as AnalyticsTracker keeps it for the tab.
const VIA_KEY = "purify:via";

type Answers = { background?: Background; level?: Level; intent?: Intent };

type OnboardingEvent =
  | { name: "onboarding_step"; props: { route: CountRoute; step: CountStep } }
  | { name: "onboarding_answer"; props: { route: CountRoute; question: CountQuestion; answer: string } }
  | { name: "onboarding_skipped"; props: { route: CountRoute; at: CountStep } }
  | { name: "onboarding_finished"; props: { route: CountRoute; account: boolean } & Answers }
  | { name: "onboarding_dayone"; props: { route?: CountRoute; key: DayOneKey } & Answers }
  | { name: "onboarding_returned"; props: { route: CountRoute; day: 2 | 7 | 30 } & Answers };

/** The words already counted in this run of the questions. */
let counted = new Set<string>();

/** A new run of the questions: every screen and question may count once again. */
export function beginCountRun(): void {
  counted = new Set();
}

/** This device counts nothing from now on (the admin, opened here). */
export function markCountingOff(): void {
  try {
    window.localStorage.setItem(OFF_KEY, "1");
  } catch {
    /* storage blocked: nothing to mark */
  }
}

export function isCountingOff(): boolean {
  try {
    return window.localStorage.getItem(OFF_KEY) === "1";
  } catch {
    return true;
  }
}

function automated(): boolean {
  try {
    if (navigator.webdriver) return true;
    const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands
      ?.map((b) => b.brand)
      .join(", ");
    return isAutomatedAgent(navigator.userAgent, brands);
  } catch {
    return true;
  }
}

function platform(): CountPlatform {
  return nativePlatform() ?? (isDesktopApp() ? "desktop" : "web");
}

/** The link tag this visit came by, if any (an ad's theme, an email). */
function door(): string | undefined {
  try {
    return cleanTag(window.sessionStorage.getItem(VIA_KEY)) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * `kept` is what the device kept when it finished (the door it came by, the
 * version of the questions it answered), for counts made on a later visit.
 */
function send(event: OnboardingEvent, kept?: { door?: string; v?: number }): void {
  if (typeof window === "undefined" || isCountingOff() || automated()) return;
  const body = eventBody(event, { v: kept?.v ?? COUNT_VERSION, platform: platform(), door: kept ? kept.door : door() });
  void apiFetch("/api/track/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

/** Count a screen, an answer or a skip, once per run of the questions. */
export function countOnboarding(event: Extract<OnboardingEvent, { name: "onboarding_step" | "onboarding_answer" | "onboarding_skipped" }>): void {
  const key =
    event.name === "onboarding_step"
      ? `step:${event.props.step}`
      : event.name === "onboarding_answer"
        ? `answer:${event.props.question}`
        : "skipped";
  if (counted.has(key)) return;
  counted.add(key);
  send(event);
}

/**
 * The questions were finished: counted, and kept on the device so that its
 * coming back can be counted with these answers later.
 */
export function countFinished(route: CountRoute, answers: Answers, account: boolean): void {
  if (counted.has("finished")) return;
  counted.add("finished");
  if (typeof window === "undefined") return;
  const d = door();
  send({ name: "onboarding_finished", props: { route, account, ...answers } });
  if (isCountingOff() || automated()) return;
  const record: FinishedRecord = { at: utcDay(new Date()), v: COUNT_VERSION, route, ...(d ? { door: d } : {}), ...answers, sent: [] };
  try {
    window.localStorage.setItem(FINISHED_KEY, JSON.stringify(record));
  } catch {
    /* storage blocked: the return days go uncounted */
  }
}

/** The Day 1 card's step was opened from Today. */
export function countDayOne(key: DayOneKey, answers: Answers): void {
  if (typeof window === "undefined") return;
  const record = readRecord();
  send(
    { name: "onboarding_dayone", props: { key, ...(record ? { route: record.route } : {}), ...answers } },
    record ? { door: record.door, v: record.v } : undefined,
  );
}

function readRecord(): FinishedRecord | null {
  try {
    return parseFinishedRecord(window.localStorage.getItem(FINISHED_KEY));
  } catch {
    return null;
  }
}

/** On any page load: say once that this device came back on day 2, 7 or 30. */
export function countReturns(): void {
  if (typeof window === "undefined") return;
  const record = readRecord();
  if (!record) return;
  const due = returnsDue(record, utcDay(new Date()));
  if (!due.length) return;
  const answers: Answers = {
    ...(record.background ? { background: record.background } : {}),
    ...(record.level ? { level: record.level } : {}),
    ...(record.intent ? { intent: record.intent } : {}),
  };
  // Marked before it is sent: a device that cannot keep the mark says nothing,
  // rather than saying it came back on every visit.
  try {
    window.localStorage.setItem(FINISHED_KEY, JSON.stringify({ ...record, sent: [...record.sent, ...due] }));
  } catch {
    return;
  }
  for (const day of due) {
    send({ name: "onboarding_returned", props: { route: record.route, day, ...answers } }, { door: record.door, v: record.v });
  }
}
