// A reader's wish for reminders, kept across a sign-in.
//
// Reminders are kept with an account: a phone's token and a browser's
// subscription are saved for whoever is signed in, and the server keeps no
// device without one. So a reader who is not signed in and asks for
// reminders is asked to sign in first (components/onboarding/OnboardingFlow,
// the reminders step), and this is what remembers, through the sign-in
// screen and back, that they asked and at which times. The step that comes
// back reads it and carries on; finishing or declining clears it.
//
// Kept on the device only, like every answer in the welcome questions.

import { reminderChange, shownTimes, type ReminderTimes } from "./times";

const WISH_KEY = "purify:push.wish";

/** Remember that this reader asked for reminders at these times. */
export function keepReminderWish(times: ReminderTimes): void {
  try {
    window.localStorage.setItem(WISH_KEY, JSON.stringify(times));
  } catch {
    /* storage blocked: the reader asks again after signing in */
  }
}

/** The times this reader asked for before signing in, or null when they did not ask. */
export function readReminderWish(): ReminderTimes | null {
  try {
    const raw = window.localStorage.getItem(WISH_KEY);
    if (!raw) return null;
    return shownTimes(reminderChange(JSON.parse(raw)));
  } catch {
    return null;
  }
}

export function clearReminderWish(): void {
  try {
    window.localStorage.removeItem(WISH_KEY);
  } catch {
    /* nothing to clear */
  }
}
