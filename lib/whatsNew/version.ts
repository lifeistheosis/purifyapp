// Single source of truth for the "What's new" notification state. Bump
// CURRENT_VERSION whenever a release surfaces in the hero chip so the glowing
// "New" badge returns for every reader (their localStorage holds the last
// version they opened; a mismatch re-arms the badge).

export const CURRENT_VERSION = "1.5.2";

/**
 * The release a version belongs to: "1.5.1" is a patch of "1.5".
 *
 * A patch refines what its release brought. It has a note of its own, and
 * neither pictures nor an announcement of its own: the top of What's New
 * keeps the release's highlights, and the release email stays the
 * release's. Without this, cutting 1.5.1 before the 1.5 email had gone out
 * would have turned that email into a letter about a refinement.
 */
export function featureRelease(version: string): string {
  return version.split(".").slice(0, 2).join(".");
}

export const WHATS_NEW_SEEN_KEY = "purify:whatsNewSeen";
