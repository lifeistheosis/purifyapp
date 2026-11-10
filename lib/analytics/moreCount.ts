// Sending the seven counts (1.9): fire and forget, never in the way.
//
// What is counted and why is ./moreCounting.ts. This file only sends, on the
// locks' rules (./lockCount.ts): automation counts nothing, a device the
// admin has been opened on counts nothing, and a count carries no cookie and
// no sign-in. And NOTHING IS SENT while MORE_COUNTS_SENDING is off, which it
// is until each count's sentence is on the privacy page.

import { countPlatform, countingAllowed } from "@/lib/onboarding/count";
import { daysBetween, utcDay } from "@/lib/onboarding/counting";
import { isNativeClient } from "@/lib/platform/native";
import { SITE_URL } from "@/lib/site";

import type { Lock } from "./lockCounting";
import { firstOpenDay } from "./screenCount";
import {
  MORE_COUNTS_SENDING,
  NEW_ACCOUNT_MS,
  actDay,
  actOf,
  isAccountPlace,
  moreEventBody,
  type AccountPlace,
  type CardDid,
  type MoreEvent,
  type PlusStep,
  type PricingPlan,
  type ReminderPlace,
  type StepDid,
  type TodayCard,
} from "./moreCounting";

const FIRST_ACT_KEY = "purify:count.firstact"; // "1" once said
const ACCOUNT_FROM_KEY = "purify:count.account.from"; // AccountPlace: where a sign-in was last begun
const ACCOUNT_SAID_KEY = "purify:count.account.said"; // "1" once an account made here was said

/** Whether the seven may be sent from this device now. The words on older rows ask the same. */
export function moreCountsOn(): boolean {
  return MORE_COUNTS_SENDING && typeof window !== "undefined" && countingAllowed();
}

function send(event: MoreEvent): void {
  if (!moreCountsOn()) return;
  const url = isNativeClient() ? `${SITE_URL}/api/track/event` : "/api/track/event";
  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: moreEventBody(event, countPlatform()),
      credentials: "omit",
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* the count is lost, nothing else */
  }
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function keep(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * A day's mark was made on this device (lib/prayers/storage.ts PRAYER_EVENT,
 * with the rule and the day): if it is the first prayer or chapter this
 * device has finished, say so once. Only a device that began new: one that
 * had used Purify before its first open was recorded is no new reader.
 */
export function countFirstAct(ruleId: string): void {
  if (!moreCountsOn() || read(FIRST_ACT_KEY)) return;
  const kind = actOf(ruleId);
  const opened = firstOpenDay();
  if (!kind || !opened) return;
  // Marked before it is sent, as every once-only count is.
  if (!keep(FIRST_ACT_KEY, "1")) return;
  send({ name: "first_act", props: { kind, day: actDay(daysBetween(opened, utcDay(new Date()))) } });
}

/** A step of a first week, opened or closed unopened: its day of the seven, from 1. */
export function countWeekStep(n: number, did: StepDid): void {
  if (Number.isInteger(n) && n >= 1 && n <= 7) send({ name: "week_step", props: { n, did } });
}

/** A sign-in was begun from here; if an account comes of it, this is where it was made. */
export function markAccountFrom(where: AccountPlace): void {
  if (typeof window !== "undefined") keep(ACCOUNT_FROM_KEY, where);
}

/**
 * On a page load, signed in: if the account is new (made in the last half
 * hour) and this device has not said so, say where it was made. An account
 * made anywhere a sign-in was not begun from is the sign-up page's.
 */
export function countAccountIfNew(createdAt: string | null | undefined): void {
  if (!moreCountsOn() || read(ACCOUNT_SAID_KEY)) return;
  const made = createdAt ? Date.parse(createdAt) : NaN;
  if (!Number.isFinite(made) || Date.now() - made > NEW_ACCOUNT_MS || Date.now() < made - 60_000) return;
  const from = read(ACCOUNT_FROM_KEY);
  if (!keep(ACCOUNT_SAID_KEY, "1")) return;
  send({ name: "account_made", props: { where: isAccountPlace(from) ? from : "signup" } });
}

/** Reminders were turned on or off, here. */
export function countReminders(to: "on" | "off", where: ReminderPlace): void {
  send({ name: "reminders_set", props: { to, where } });
}

/** In the Plus sheet: a feature's Try it opened, or the button to subscribe tapped. */
export function countPlusStep(lock: Lock, step: PlusStep): void {
  send({ name: "plus_step", props: { lock, step } });
}

/** A Plus subscription went through on the pricing page. */
export function countPricingBought(plan: PricingPlan): void {
  send({ name: "pricing_bought", props: { plan } });
}

/** One of the two small cards on Today, answered or closed. */
export function countTodayCard(card: TodayCard, did: CardDid): void {
  send({ name: "today_card", props: { card, did } });
}
