// First-run onboarding state, kept on the device (no account required).
//
// Follows the same localStorage + custom-event idiom as
// `lib/calendar/styleDefault.ts` so subscribers refresh in-tab without
// waiting on the cross-tab `storage` event. Hook-free on purpose so it can
// be imported anywhere; the only React surface is the small reader inside
// the onboarding components, which use `useEffect`.

export const ONBOARDING_VERSION = 1;

const ONBOARDED_KEY = "purify:onboarded"; // stores the version number once done
const FOCUS_KEY = "purify:focus"; // JSON array of Focus ids
const NUDGE_DISMISSED_KEY = "purify:firststeps.dismissed";
const NUDGE_ELIGIBLE_KEY = "purify:firststeps.eligible";

/** Fired in-tab whenever onboarding state changes. */
export const ONBOARDING_EVENT = "purify:onboarding";

export type Focus = "scripture" | "prayer" | "saints" | "calendar";
const FOCUS_VALUES: readonly Focus[] = [
  "scripture",
  "prayer",
  "saints",
  "calendar",
];

function emit() {
  try {
    window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT));
  } catch {
    /* ignore */
  }
}

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(ONBOARDED_KEY);
    return v != null && Number(v) >= ONBOARDING_VERSION;
  } catch {
    // Storage blocked → behave as onboarded so we never trap the user in a
    // loop they can't dismiss.
    return true;
  }
}

// Prefixes of localStorage keys that only exist once a user has actually
// engaged — saved something, changed a preference, read, or prayed. We match
// against these (an allowlist) rather than sweeping every `purify*` key,
// because the app writes incidental bookkeeping on a brand-new visit too
// (`purify_install_visits`, analytics ids, our own onboarding flags). A
// deterministic allowlist avoids racing those.
const PRIOR_USE_PREFIXES: readonly string[] = [
  "purify:bookmark", // saved a verse/passage
  "purify:annotation", // highlighted or noted
  "purify:calendar.style", // chose a calendar reckoning
  "purify.today.goals", // used the daily goals
  "purify:today-goals",
  "purify.reader.", // changed reader prefs / read positions
  "purify:reader-prefs",
  "purify.bible.", // opened the Bible reader
  "purify:bible:",
  "purify:reading-history",
  "purify.prayers.", // prayed
  "purify:prayer-",
  "purify.rope.",
  "purify:rope",
  "purify:florileg", // built a florilegium
  "purify:intentions",
  "purify.ambience.", // changed ambience
  "purify_local_account", // claimed a local account
  "purify:local-account",
  "purify:whatsNewSeen", // saw a prior release's notes
];

/**
 * Has this device used Purify before? True when signed in
 * ("sb-<ref>-auth-token") or any genuine-engagement key is present. Such a
 * returning user must NOT be interrupted with first-run onboarding.
 */
export function priorUseDetected(): boolean {
  if (typeof window === "undefined") return true;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) return true;
      if (PRIOR_USE_PREFIXES.some((p) => key.startsWith(p))) return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** Should the first-run flow be shown to this visitor right now? */
export function shouldShowOnboarding(): boolean {
  if (isOnboarded()) return false;
  if (priorUseDetected()) {
    // Returning user who predates onboarding: mark done quietly so we never
    // scan again, and never show them the flow or the first-step nudge.
    markOnboardedSilently();
    return false;
  }
  return true;
}

/** Completed (or skipped) the real flow as a genuine new user. */
export function markOnboarded(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDED_KEY, String(ONBOARDING_VERSION));
    window.localStorage.setItem(NUDGE_ELIGIBLE_KEY, "1");
  } catch {
    /* ignore */
  }
  emit();
}

/** Existing user, marked done without ever seeing the flow or the nudge. */
export function markOnboardedSilently(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDED_KEY, String(ONBOARDING_VERSION));
  } catch {
    /* ignore */
  }
  emit();
}

export function readFocus(): Focus[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FOCUS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is Focus =>
      FOCUS_VALUES.includes(x as Focus),
    );
  } catch {
    return [];
  }
}

export function writeFocus(focus: Focus[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FOCUS_KEY, JSON.stringify(focus));
  } catch {
    /* ignore */
  }
  emit();
}

// --- First-step nudge (Today) -------------------------------------------

export function isNudgeEligible(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(NUDGE_ELIGIBLE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isNudgeDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(NUDGE_DISMISSED_KEY) === "1";
  } catch {
    return true;
  }
}

export function dismissNudge(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NUDGE_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
  emit();
}

/**
 * The single first step we point a new user toward, chosen from their
 * stated focus (fixed priority when several are picked). Defaults to the
 * Gospel of John when nothing was selected.
 */
export function firstStepFor(focus: Focus[]): { key: Focus | "default"; href: string } {
  const order: Focus[] = ["prayer", "scripture", "saints", "calendar"];
  const picked = order.find((f) => focus.includes(f));
  switch (picked) {
    case "prayer":
      return { key: "prayer", href: "/prayers" };
    case "scripture":
      return { key: "scripture", href: "/bible/john/1" };
    case "saints":
      return { key: "saints", href: "/saints" };
    case "calendar":
      return { key: "calendar", href: "/calendar" };
    default:
      return { key: "default", href: "/bible/john/1" };
  }
}
