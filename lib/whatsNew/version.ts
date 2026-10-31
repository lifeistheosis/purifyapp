// Single source of truth for the "What's new" notification state. Bump
// CURRENT_VERSION whenever a release surfaces in the hero chip so the glowing
// "New" badge returns for every reader (their localStorage holds the last
// version they opened; a mismatch re-arms the badge).

export const CURRENT_VERSION = "1.8";

/**
 * The release a version belongs to: "1.5.1" is a patch of "1.5".
 *
 * A patch refines what its release brought. It has a note of its own, and
 * neither pictures nor an announcement of its own: the top of What's New
 * keeps the release's highlights, and the release email stays the
 * release's. Without this, cutting 1.5.1 before the 1.5 email had gone out
 * would have turned that email into a letter about a refinement.
 *
 * A release's name is found the same way: a patch goes by the name its
 * release has, and has none of its own (lib/whatsNew/releaseName.ts).
 */
export function featureRelease(version: string): string {
  return version.split(".").slice(0, 2).join(".");
}

export const WHATS_NEW_SEEN_KEY = "purify:whatsNewSeen";

/**
 * Two versions in order: below 0 when `a` is the older, 0 when they are the
 * same release ("1.6.0" is "1.6"), above 0 when `a` is the newer. Read number
 * by number, not as text: "1.10" is newer than "1.9". Null when either is not
 * a version at all.
 */
export function compareVersions(a: string, b: string): number | null {
  const parts = (v: string) => v.trim().split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  const x = parts(a);
  const y = parts(b);
  if (x.some(Number.isNaN) || y.some(Number.isNaN)) return null;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const p = x[i] ?? 0;
    const q = y[i] ?? 0;
    if (p !== q) return p < q ? -1 : 1;
  }
  return 0;
}

/**
 * Whether a release is newer than the one this device last saw, for the
 * bell in the phone tab bar (components/nav/NotificationsButton.tsx).
 *
 * A stored version above this build's (a device that ran a later build, or a
 * test that stores one to say "seen") is not a new release. Nothing stored,
 * or something that is not a version, counts as not seen.
 */
export function whatsNewUnseen(seen: string | null, current: string = CURRENT_VERSION): boolean {
  if (!seen) return true;
  const order = compareVersions(seen, current);
  return order === null || order < 0;
}
