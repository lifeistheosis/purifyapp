// The opt-out for the community supporter mark, kept on the device like
// every other preference and synced to profiles.show_supporter_mark through
// lib/profile/preferences.ts.
//
// Same localStorage + custom-event idiom as lib/onboarding/state.ts and
// lib/calendar/styleDefault.ts, and hook-free like them so preferences.ts
// can import it without pulling React in. The hook is in
// useShowSupporterMark.ts.
//
// Three states, not two: an unset key means the reader has never touched
// the toggle, which the sync treats as "take whatever the account says"
// rather than as an answer.
//
// The default is ON. That is also the column default, so a reader who never
// opens the toggle is marked while subscribed, which is what the spec asks
// for and what the privacy page says.

const KEY = "purify:supporterMark";
export const SUPPORTER_MARK_KEY = KEY;
export const SUPPORTER_MARK_EVENT = "purify:supporterMark";

function emit() {
  try {
    window.dispatchEvent(new CustomEvent(SUPPORTER_MARK_EVENT));
  } catch {
    /* ignore */
  }
}

/** True, false, or null when the reader has never chosen. */
export function readShowSupporterMark(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function writeShowSupporterMark(show: boolean | null): void {
  if (typeof window === "undefined") return;
  try {
    if (show === null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, show ? "1" : "0");
  } catch {
    /* ignore */
  }
  emit();
}
