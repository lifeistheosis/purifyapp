// Unified prayer-reminders facade. Picks native push (APNs/FCM, inside the
// Capacitor shell) or Web Push (browser/PWA) so callers, the onboarding
// priming step and the account opt-in toggle, don't branch themselves.

import { isNativeClient } from "@/lib/platform/native";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import {
  getExistingSubscription,
  markSaved,
  permissionDenied,
  persistSubscription,
  pushSupported,
  removeSubscription,
  requestAndSubscribe,
  stashPending,
  updateWebTimes,
  webReminderTimes,
} from "./client";
import {
  disableNative,
  enableNative,
  nativeReminderTimes,
  nativeStatus,
  updateNativeTimes,
} from "./native";
import {
  EVENING_DEFAULT,
  MORNING_DEFAULT,
  type ReminderChange,
  type ReminderTimes,
  type SaveResult,
} from "./times";

export { MORNING_DEFAULT, EVENING_DEFAULT };
export type { ReminderChange, ReminderTimes, SaveResult };

export type ReminderStatus =
  | "unsupported"
  | "denied"
  | "not-subscribed"
  | "subscribed";

/**
 * "signed-out": nobody is signed in, so there is no account to keep the
 * reminders with, and nothing was asked of the device. The caller asks for a
 * sign-in (components/onboarding/OnboardingFlow, the reminders step).
 */
export type EnableResult =
  | { ok: true }
  | { ok: false; reason: "denied" | "unsupported" | "no-vapid" | "failed" | "signed-out" };

/**
 * Whether this device has reminders. "subscribed" only with an account
 * signed in: a phone's token and a browser's subscription are kept for an
 * account and nowhere else, so with nobody signed in nothing can come, and
 * the device is never shown as having reminders.
 */
export async function remindersStatus(): Promise<ReminderStatus> {
  if (isNativeClient()) return nativeStatus();
  if (!pushSupported()) return "unsupported";
  if (permissionDenied()) return "denied";
  if (!readLocalSessionUser()) return "not-subscribed";
  return (await getExistingSubscription()) ? "subscribed" : "not-subscribed";
}

/**
 * Turn reminders on for this device: "ok" only once the server holds it.
 *
 * Until 2026-10-31 a reader with no account was told "on" by both: the
 * browser's subscription and the phone's token were kept on the device for
 * an account that might never come, and nothing was sent in the meantime.
 * Now nobody signed in means "signed-out" before the device is asked
 * anything, and a server that does not take it means "failed" now, though a
 * browser keeps its subscription for the next visit to send (healWebPush).
 */
export async function enableReminders(
  morning: string = MORNING_DEFAULT,
  evening: string = EVENING_DEFAULT,
): Promise<EnableResult> {
  if (isNativeClient()) return enableNative(morning, evening);
  if (!readLocalSessionUser()) return { ok: false, reason: "signed-out" };

  const result = await requestAndSubscribe();
  if (!result.ok) return { ok: false, reason: result.reason };
  try {
    const res = await persistSubscription(result.subscription, { morning, evening });
    if (res.ok) {
      markSaved(result.subscription.endpoint);
      return { ok: true };
    }
    // The browser is subscribed and the server did not take it: saying "on"
    // would promise reminders that have nowhere to come from. Kept with its
    // times, so a sign-in (flushPending) or the next visit sends it again.
    stashPending(result.subscription, { morning, evening });
    return { ok: false, reason: res.status === 401 ? "signed-out" : "failed" };
  } catch {
    // Offline at that moment: kept for the next visit, and not called "on".
    stashPending(result.subscription, { morning, evening });
    return { ok: false, reason: "failed" };
  }
}

export async function disableReminders(): Promise<void> {
  if (isNativeClient()) return disableNative();
  await removeSubscription();
}

/**
 * The times this device's reminders come at, as saved: a phone's own copy,
 * or a browser's saved row with anything still waiting to be sent laid over
 * it. The account screen shows these, and compares a field left against
 * them to tell whether anything changed.
 */
export async function reminderTimes(): Promise<ReminderTimes> {
  if (isNativeClient()) return nativeReminderTimes();
  return webReminderTimes();
}

/**
 * Save the time or times the reader changed, and nothing else. Never
 * throws: a change that could not reach the server yet is kept on the device
 * and sent on by itself ("kept"), on the web at the sign-in or the next
 * visit, on a phone at the next launch.
 */
export async function updateReminderTimes(change: ReminderChange): Promise<SaveResult> {
  try {
    if (isNativeClient()) return await updateNativeTimes(change);
    return await updateWebTimes(change);
  } catch {
    return "failed";
  }
}
