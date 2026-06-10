// Saves and restores the last-read section of a long Father's work, per
// device, in localStorage. Designed to be invisible: when you come back
// to the same work, the page jumps to where you last were, no toast or
// modal.
//
// Storage shape per work:
//   key   = `purify.reader.position.<saint-slug>/<work-slug>`
//   value = JSON `{ sectionN: number, savedAt: number }`
//
// SavedAt is a Date.now() epoch. We expire entries older than 7 days so
// a stale "last position" doesn't surprise the reader weeks later. On
// the same work within the window, restoration is silent.
//
// Hidden v10.0 setup: the same persistence pattern extends to Bible
// chapters (continuous-reading mode + audio-bible resume).

const STORAGE_PREFIX = "purify.reader.position.";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type ReaderPosition = {
  sectionN: number;
  savedAt: number;
};

function keyFor(saintSlug: string, workSlug: string): string {
  return `${STORAGE_PREFIX}${saintSlug}/${workSlug}`;
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

/**
 * Load the saved reading position, or null if absent / expired /
 * unparseable. Returning null on any error keeps callers simple.
 */
export function loadPosition(
  saintSlug: string,
  workSlug: string,
): ReaderPosition | null {
  if (!hasWindow()) return null;
  try {
    const raw = localStorage.getItem(keyFor(saintSlug, workSlug));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<ReaderPosition>;
    if (
      typeof v.sectionN !== "number" ||
      typeof v.savedAt !== "number" ||
      !Number.isFinite(v.sectionN) ||
      !Number.isFinite(v.savedAt)
    ) {
      return null;
    }
    if (Date.now() - v.savedAt > TTL_MS) return null;
    return { sectionN: v.sectionN, savedAt: v.savedAt };
  } catch {
    return null;
  }
}

/**
 * Persist the current reading position. Fire-and-forget; failures
 * (private mode, storage full) are swallowed so reading never breaks.
 */
export function savePosition(
  saintSlug: string,
  workSlug: string,
  sectionN: number,
): void {
  if (!hasWindow()) return;
  if (!Number.isFinite(sectionN) || sectionN < 1) return;
  try {
    const value: ReaderPosition = { sectionN, savedAt: Date.now() };
    localStorage.setItem(keyFor(saintSlug, workSlug), JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/**
 * Drop any saved position. Called when the reader reaches the work's
 * last section, so completing a work doesn't leave a stale resume
 * point that would land you at the end again next time.
 */
export function clearPosition(saintSlug: string, workSlug: string): void {
  if (!hasWindow()) return;
  try {
    localStorage.removeItem(keyFor(saintSlug, workSlug));
  } catch {
    /* ignore */
  }
}
