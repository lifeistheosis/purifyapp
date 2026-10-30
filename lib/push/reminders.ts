// Unified prayer-reminders facade. Picks native push (APNs/FCM, inside the
// Capacitor shell) or Web Push (browser/PWA) so callers, the onboarding
// priming step and the account opt-in toggle, don't branch themselves.

import { isNativeClient } from "@/lib/platform/native";
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

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: "denied" | "unsupported" | "no-vapid" | "failed" };

export async function remindersStatus(): Promise<ReminderStatus> {
  if (isNativeClient()) return nativeStatus();
  if (!pushSupported()) return "unsupported";
  if (permissionDenied()) return "denied";
  return (await getExistingSubscription()) ? "subscribed" : "not-subscribed";
}

export async function enableReminders(
  morning: string = MORNING_DEFAULT,
  evening: string = EVENING_DEFAULT,
): Promise<EnableResult> {
  if (isNativeClient()) return enableNative(morning, evening);

  const result = await requestAndSubscribe();
  if (!result.ok) return { ok: false, reason: result.reason };
  try {
    const res = await persistSubscription(result.subscription, { morning, evening });
    if (res.status === 401) {
      // Signed-out web visitor: keep the browser subscription, persist on login.
      stashPending(result.subscription, { morning, evening });
    } else if (!res.ok) {
      // The browser is subscribed and the server did not take it: saying
      // "on" would promise reminders that have nowhere to come from. Kept
      // with its times, so the next visit sends it again (healWebPush).
      stashPending(result.subscription, { morning, evening });
      return { ok: false, reason: "failed" };
    } else {
      markSaved(result.subscription.endpoint);
    }
  } catch {
    // Offline at that moment: keep it for the next sign-in or visit.
    stashPending(result.subscription, { morning, evening });
  }
  return { ok: true };
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
