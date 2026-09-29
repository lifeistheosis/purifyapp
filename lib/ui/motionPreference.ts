// Whether motion is allowed, and who gets to decide.
//
// Until now the OS hint was the only input: prefers-reduced-motion said calm,
// and every rAF tween in the app went still. That is right for a reader, and
// wrong for the operator, whose Windows animation setting is off for reasons
// that have nothing to do with wanting a still dashboard. The odometer this was
// written for never moved a wheel on the machine that built it.
//
// Two surfaces, two defaults, one preference.
//
//   THE ADMIN PANEL defaults to motion. It is one person's own tool, opened
//   deliberately, and its animation IS the information: a wheel that spins is
//   how you see which number moved. Suppressing that on an OS hint aimed at
//   vestibular safety in consumer UI throws away the signal and helps nobody.
//
//   THE SITE defaults to the OS. A reader who asked their system for less
//   motion asked every app on it, including this one, and Purify is opened in
//   church and at 5am. Motion there is opt in, never assumed.
//
// An explicit preference overrides both, in either direction, because somebody
// who has actually chosen outranks any default we picked for them.
//
// And one platform split on the site, the owner's decision of 2026-09-29:
//
//   THE PHONE APPS keep their motion always, whatever the OS hint says, and
//   calm down only on a device too slow to animate smoothly (./deviceSpeed.ts
//   decides that). There is no motion setting on the phones.
//
//   THE WINDOWS APP follows the OS until the reader flips the Animations
//   toggle in Settings, which it alone always shows.
//
//   THE BROWSER follows the browser's setting, and when that setting is what
//   keeps the site still, says so once (components/ui/MotionNotice.tsx) with
//   a way to turn motion on.
//
// Pure and dependency free so vitest can hold the table, which matters: the
// surface split is the kind of rule that reads as obviously correct and is easy
// to invert by accident.

export type MotionPreference = "os" | "on" | "off";

/** Where the localStorage value lives. Absent means "os". */
export const MOTION_KEY = "purify.motion";

/** Fired on the window when the preference changes, so open views re-resolve. */
export const MOTION_EVENT = "purify:motion-changed";

export function isMotionPreference(v: unknown): v is MotionPreference {
  return v === "os" || v === "on" || v === "off";
}

export type MotionSurface = "admin" | "site";

/**
 * Which surface a path belongs to.
 *
 * Prefix match on /admin, which covers the panel, its previews and the owner
 * redirect that lives beside it. Deliberately NOT a match on "admin" anywhere
 * in the path: a saint slug or a shop product could contain the word, and a
 * reader is not an operator because of what they are reading.
 */
export function surfaceForPath(pathname: string): MotionSurface {
  return pathname === "/admin" || pathname.startsWith("/admin/")
    ? "admin"
    : "site";
}

/** Where the page is running: the phone apps, the Windows app, or a browser. */
export type MotionPlatform = "native" | "desktop" | "web";

/**
 * The one decision. Returns true when motion should be suppressed.
 *
 * Note the asymmetry, which is the whole point: `osReduce` is consulted only on
 * the site. On the admin panel the OS hint is not ignored so much as already
 * answered, by the operator opening a dashboard whose numbers move. In the
 * phone apps it is not consulted at all; only a slow device is.
 *
 * `platform` defaults to "web", the behaviour before the split.
 */
export function resolveReducedMotion(input: {
  preference: MotionPreference;
  surface: MotionSurface;
  osReduce: boolean;
  platform?: MotionPlatform;
  slowDevice?: boolean;
}): boolean {
  if (input.preference === "off") return true;
  if (input.preference === "on") return false;
  if (input.surface === "admin") return false;
  if (input.platform === "native") return input.slowDevice === true;
  return input.osReduce;
}
