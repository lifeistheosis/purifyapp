import { featureRelease } from "./version";

/**
 * A release's name: the word or two it goes by beside its number.
 *
 * A release had a number and a headline (`kind`). It may now have a name as
 * well (the owner, asked which of the two an update should carry: "let's just
 * have both"). A name is optional, and no release before 1.6 has one.
 *
 * THE NAME BELONGS TO THE RELEASE. It is written once, on the release's own
 * note (9.1), and a patch (9.1.2) goes by its release's, found through
 * featureRelease() the way the highlights and the release email are. A patch
 * refines what its release brought, so it has no name of its own: one written
 * on a patch is neither kept nor shown.
 *
 * NO NAME DRAWS NOTHING. Everything that shows a name cleans it first, here,
 * so a name that is absent, empty or only spaces reads exactly as a release
 * read before there were names: no separator, no gap.
 *
 * No `server-only`: the admin editor and the reader page both import it.
 */

/**
 * The longest a name may be. About eighteen characters sit beside the number
 * on one line of a 360px phone, and a longer name wraps at a word.
 * scripts/patch-notes.mjs carries a copy, held by releaseName.test.ts.
 */
export const RELEASE_NAME_MAX = 32;

/**
 * One line of plain text: no line break, no tab, no other control character,
 * and none of the unseen marks that break a line or turn the reading
 * direction of what sits beside the name (the number, the email subject).
 * Written with property names, so no unseen character sits in this file.
 * scripts/patch-notes.mjs refuses the same four classes, held by
 * releaseName.test.ts.
 */
export const NAME_ONE_LINE = /^[^\p{Cc}\p{Zl}\p{Zp}\p{Bidi_Control}]*$/u;

/**
 * Something to read: at least one letter or number. A zero width space, a
 * joiner or a soft hyphen draws nothing and survives the trim, so a name made
 * only of those would count as a name and leave a gap beside the number. A
 * name that is not empty has to pass this. scripts/patch-notes.mjs asks the
 * same.
 */
export const NAME_HAS_TEXT = /[\p{L}\p{N}]/u;

/** Anything with a version and, perhaps, a name: a row, an entry, a draft. */
type Named = { version: string; name?: string | null };

/** A name as it is kept and shown: trimmed, and "" when there is none. */
export function cleanName(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/** Whether this version's note is where a name is written: 9.1 is, 9.1.2 is not. */
export function ownsName(version: string): boolean {
  const v = version.trim();
  return v.length > 0 && featureRelease(v) === v;
}

/**
 * The name `version` goes by, or "" when it has none: its own when it is a
 * release, its release's when it is a patch. `notes` is whatever is being
 * shown, rows or entries.
 */
export function releaseName(version: string, notes: readonly Named[]): string {
  const release = featureRelease(version.trim());
  return cleanName(notes.find((n) => n.version === release)?.name);
}

/** "9.1 Lamplight", or "9.1" alone when the release has no name. */
export function versionLabel(version: string, name?: string | null): string {
  const n = cleanName(name);
  return n ? `${version} ${n}` : version;
}

/**
 * Every note with the name it shows: a release with its own, a patch with
 * its release's.
 *
 * A note whose name does not change comes back as the same object, and until
 * a release is named that is every one of them.
 */
export function withReleaseNames<T extends Named>(notes: readonly T[]): T[] {
  return notes.map((n) => {
    const name = releaseName(n.version, notes);
    return (n.name ?? "") === name ? n : ({ ...n, name } as T);
  });
}

/**
 * What a write puts in patch_notes.name, or undefined to leave the column
 * out of the write.
 *
 * THE COLUMN MAY NOT EXIST YET. It is one `alter table` the owner has to run,
 * and until then a write that mentions `name` is refused whole. So a note
 * with no name never mentions it, which is every note today, and saving one
 * cannot break. A name is sent when there is one to keep, and an empty one
 * only to clear a name the row is known to hold, which also proves the column
 * is there.
 */
export function nameToWrite(input: Named, prior?: { name?: string | null } | null): string | undefined {
  const name = ownsName(input.version) ? cleanName(input.name) : "";
  if (name) return name;
  return cleanName(prior?.name) ? "" : undefined;
}

/**
 * The name a stored proposal gives its note. `after` is the proposal as it
 * was filed, before any default has filled it in.
 *
 * SAYING NOTHING KEEPS THE NAME. A proposal filed before names existed has no
 * `name` key at all, and one about a blurb must not take a release's name off
 * when it is accepted. scripts/patch-notes.mjs holds the same rule when it
 * files one. An empty name is said, and takes the name off.
 */
export function proposedName(after: unknown, prior?: { name?: string | null } | null): string {
  const said = typeof after === "object" && after !== null && "name" in after;
  return cleanName(said ? (after as { name?: unknown }).name : prior?.name);
}
