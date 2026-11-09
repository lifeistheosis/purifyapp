// The reader's place in a long work: a Father's work, a council's document
// (1.8). Per device, in localStorage, and invisible: coming back to the work
// lands on the paragraph the reader stopped at, no toast, no modal.
//
// Storage shape per work:
//   key   = `purify.reader.position.<saint-slug>/<work-slug>`
//   value = JSON `{ sectionN: number, paragraph: number, savedAt: number }`
//
// The paragraph, and no expiry (1.8, round 6, the owner's note 79 and sheet
// r3-29): until then a work kept only the chapter, and only for seven days,
// so a reader halfway through Conference 10, Chapter 10 of St John Cassian
// (2,072 words in one paragraph) came back to its top, and after a week to
// Start reading. It is kept now the way the Bible keeps its verse since note
// 68 (lib/bible/lastRead.ts): as the work opens, at the place its address
// lands on, or where the reader had it (arrivalPlace); after that only the
// reader's own scroll moves it, and it is the paragraph over the reading line
// (lib/saints/paragraphInView.ts, lib/ui/readingPlace.ts KEPT_AT), the one a
// return lands on. A value saved before this has no paragraph: the chapter's
// top, as it was. savedAt is a Date.now() epoch, for whichever copy is newer.

const STORAGE_PREFIX = "purify.reader.position.";
/**
 * When each work's place was let go here, its last paragraph read (1.9), so
 * a device that still keeps the place does not hand it back
 * (lib/sync/kept.ts). Not under STORAGE_PREFIX: it is no work's place.
 */
const CLEARED_KEY = "purify.reader.positions.cleared";

export type ReaderPosition = {
  sectionN: number;
  /** The paragraph's index in its section (Section.paragraphs), from 0: the #p-N-I anchor. */
  paragraph: number;
  savedAt: number;
};

/** Where a reader is in a work, as far as an address needs it. */
export type WorkPlace = { sectionN: number; paragraph: number };

function keyFor(saintSlug: string, workSlug: string): string {
  return `${STORAGE_PREFIX}${saintSlug}/${workSlug}`;
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

/** A whole number from 0, or null. */
function index(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}

/**
 * Load the saved reading position, or null if absent or unparseable.
 * Returning null on any error keeps callers simple. It never expires.
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
    return { sectionN: v.sectionN, paragraph: index(v.paragraph) ?? 0, savedAt: v.savedAt };
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
  paragraph = 0,
): void {
  if (!hasWindow()) return;
  if (!Number.isFinite(sectionN) || sectionN < 1) return;
  try {
    const value: ReaderPosition = { sectionN, paragraph: index(paragraph) ?? 0, savedAt: Date.now() };
    localStorage.setItem(keyFor(saintSlug, workSlug), JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** The place an address names: a section (#s12, its top) or a paragraph (#p-12-3); null for anything else. */
export function placeOfHash(hash: string): { sectionN: number; paragraph: number | null } | null {
  const m = /^#(?:s(\d+)|p-(\d+)-(\d+))$/.exec(hash);
  if (!m) return null;
  const sectionN = Number(m[1] ?? m[2]);
  if (!Number.isInteger(sectionN) || sectionN < 1) return null;
  return { sectionN, paragraph: m[3] === undefined ? null : Number(m[3]) };
}

/**
 * The place kept as a work opens, as the Bible keeps its verse (note 68): an
 * address that lands on a paragraph keeps that paragraph; one that names a
 * section keeps the paragraph the reader had in it, if the place is in it
 * already (Continue, the reading room's row, a section opened again), else
 * the section's top; a work opened with no address keeps the saved place, or
 * none (its beginning). Only the reader's own scroll moves it after that.
 */
export function arrivalPlace(
  saved: WorkPlace | null,
  landing: { sectionN: number; paragraph: number | null } | null,
): WorkPlace | null {
  if (landing) {
    if (landing.paragraph !== null) return { sectionN: landing.sectionN, paragraph: landing.paragraph };
    if (saved && saved.sectionN === landing.sectionN) return { sectionN: saved.sectionN, paragraph: saved.paragraph };
    return { sectionN: landing.sectionN, paragraph: 0 };
  }
  return saved ? { sectionN: saved.sectionN, paragraph: saved.paragraph } : null;
}

/** The address that lands on a place: the paragraph past a section's first, else the section. */
export function placeHash(p: WorkPlace): string {
  return p.paragraph > 0 ? `#p-${p.sectionN}-${p.paragraph}` : `#s${p.sectionN}`;
}

/**
 * Carry a saved place to where its section stands now, in another work (1.8:
 * a part of a work that became a work of its own, lib/saints/workMoves.ts).
 * `moveSection` answers the section's new number, or null for one that
 * stayed. A place already kept in the new work, and newer, wins. True when
 * it moved.
 */
export function movePosition(
  from: { saintSlug: string; workSlug: string },
  to: { saintSlug: string; workSlug: string },
  moveSection: (n: number) => number | null,
): boolean {
  if (!hasWindow()) return false;
  try {
    const raw = localStorage.getItem(keyFor(from.saintSlug, from.workSlug));
    if (!raw) return false;
    const v = JSON.parse(raw) as Record<string, unknown>;
    const n = typeof v.sectionN === "number" ? moveSection(v.sectionN) : null;
    if (n === null) return false;
    const there = localStorage.getItem(keyFor(to.saintSlug, to.workSlug));
    const thereAt = there ? Number((JSON.parse(there) as { savedAt?: unknown }).savedAt) : -Infinity;
    if (!(thereAt >= Number(v.savedAt))) localStorage.setItem(keyFor(to.saintSlug, to.workSlug), JSON.stringify({ ...v, sectionN: n }));
    localStorage.removeItem(keyFor(from.saintSlug, from.workSlug));
    return true;
  } catch {
    return false;
  }
}

/**
 * Drop any saved position. Called when the reader has read past the end
 * of the work's last paragraph, so finishing a work doesn't leave a resume
 * point that would land them at the end again next time.
 */
export function clearPosition(saintSlug: string, workSlug: string): void {
  if (!hasWindow()) return;
  try {
    localStorage.removeItem(keyFor(saintSlug, workSlug));
    writeCleared({ ...readClearedPositions(), [`${saintSlug}/${workSlug}`]: Date.now() });
  } catch {
    /* ignore */
  }
}

/** When each work's place was let go here, by "<saint>/<work>". */
export function readClearedPositions(): Record<string, number> {
  if (!hasWindow()) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(CLEARED_KEY) ?? "{}") as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [key, at] of Object.entries(parsed)) if (typeof at === "number" && Number.isFinite(at)) out[key] = at;
    return out;
  } catch {
    return {};
  }
}

function writeCleared(cleared: Record<string, number>): void {
  try {
    localStorage.setItem(CLEARED_KEY, JSON.stringify(cleared));
  } catch {
    /* ignore */
  }
}

/** Every work's place kept here, by "<saint>/<work>" (lib/sync/kept.ts). */
export function readAllPositions(): Record<string, ReaderPosition> {
  if (!hasWindow()) return {};
  const out: Record<string, ReaderPosition> = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      const work = key.slice(STORAGE_PREFIX.length);
      const [saintSlug, workSlug, ...rest] = work.split("/");
      if (!saintSlug || !workSlug || rest.length) continue;
      const place = loadPosition(saintSlug, workSlug);
      if (place) out[work] = place;
    }
  } catch {
    /* what was read so far */
  }
  return out;
}

/**
 * Put in place what another device kept (lib/sync/kept.ts): a place newer
 * than this device's is taken, and a place let go there after this device
 * last kept it is let go here.
 */
export function writePositionsFromSync(works: Record<string, ReaderPosition>, cleared: Record<string, number>): void {
  if (!hasWindow()) return;
  const here = readAllPositions();
  try {
    for (const [work, place] of Object.entries(works)) {
      if (!(place.savedAt > (here[work]?.savedAt ?? -1))) continue;
      localStorage.setItem(`${STORAGE_PREFIX}${work}`, JSON.stringify(place));
    }
    for (const [work, at] of Object.entries(cleared)) {
      const kept = works[work] && works[work].savedAt > (here[work]?.savedAt ?? -1) ? works[work] : here[work];
      if (kept && at >= kept.savedAt) localStorage.removeItem(`${STORAGE_PREFIX}${work}`);
    }
    writeCleared({ ...readClearedPositions(), ...cleared });
  } catch {
    /* ignore */
  }
}
