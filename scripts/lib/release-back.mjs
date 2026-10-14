// The way back: the commit on origin/main that a release's push replaces,
// written into the release's checklist before the push.
//
// A push to main is the deploy, and until 1.6 nothing wrote down what was
// live before it. If a release goes wrong, the website goes back to that
// commit by a new commit pushed to main (docs/RELEASE.md, "If it goes
// wrong"), and that is quicker and safer with the commit named in advance,
// while it is still the obvious one, than worked out from the log in a hurry.
//
// `node scripts/release.mjs back` records it as a line in
// docs/plans/v<version>/RELEASE.md, `Way back: <sha> <subject>`, and
// `release.mjs check` says NO while the line is missing or names a commit
// origin/main has moved past. No git and no fs here: release.mjs asks git and
// writes the file, and lib/release/__tests__/wayBack.test.ts imports this as
// it is.

export const SECTION_HEADING = "## If it goes wrong";

/** A recorded line. The template's placeholder ("Way back: not recorded yet") is not one. */
const RECORDED = /^Way back: ([0-9a-f]{7,40}) (.*\S)[ \t]*$/m;
/** Any Way back line, the placeholder included: the one `back` writes over. */
const ANY = /^Way back:.*$/m;
const EM_DASH = String.fromCharCode(0x2014);

/**
 * @typedef {{ sha: string, subject: string }} WayBack
 */

/**
 * The way back a checklist records, or null.
 * @param {string | null | undefined} text
 * @returns {WayBack | null}
 */
export function readWayBack(text) {
  const m = RECORDED.exec(String(text ?? "").replace(/\r\n/g, "\n"));
  return m ? { sha: m[1], subject: m[2] } : null;
}

/**
 * The line itself. A subject is someone's commit message and is kept as it
 * was, except that an em dash becomes a hyphen: this repo carries none.
 * @param {WayBack} record
 */
export function wayBackLine(record) {
  return `Way back: ${record.sha} ${String(record.subject).split(EM_DASH).join("-").replace(/\s+/g, " ").trim()}`;
}

/**
 * The checklist with the way back written into it: over the Way back line
 * when there is one, under the "If it goes wrong" heading when there is that,
 * and otherwise with `section` (the template's, which carries the line)
 * added at the end. Returns LF text; release.mjs keeps the file's own endings.
 * @param {string} text
 * @param {WayBack} record
 * @param {string} section
 */
export function writeWayBack(text, record, section) {
  const lf = String(text).replace(/\r\n/g, "\n").replace(/\n*$/, "\n");
  const line = wayBackLine(record);
  if (ANY.test(lf)) return lf.replace(ANY, line);
  const heading = lf.indexOf(`\n${SECTION_HEADING}\n`);
  if (heading >= 0) {
    const after = heading + SECTION_HEADING.length + 2;
    const rest = lf.slice(after);
    return `${lf.slice(0, after)}\n${line}\n${rest.startsWith("\n") || !rest ? "" : "\n"}${rest}`;
  }
  const own = String(section).replace(/\r\n/g, "\n").trim();
  const filled = ANY.test(own) ? own.replace(ANY, line) : `${own}\n\n${line}`;
  return `${lf.replace(/\n*$/, "")}\n\n${filled}\n`;
}

/**
 * Why `back` may not record origin/main as the way back, or null when it may.
 * @param {{
 *   path: string, originMain: string | null, head: string | null,
 *   isAncestor: boolean, onMain: WayBack | null
 * }} at
 *   `onMain` is the way back origin/main's own copy of the checklist records:
 *   once there is one, the release is out and its line stays as it is.
 * @returns {string | null}
 */
export function backRefusal({ path, originMain, head, isAncestor, onMain }) {
  if (!originMain) return "origin/main is not known in this checkout. Fetch it first: git fetch origin   (or add --fetch)";
  if (onMain) {
    return `origin/main already carries ${path} with its way back, ${onMain.sha.slice(0, 8)} ${onMain.subject}. ` +
      "This release is out, and that line stays as it is.";
  }
  if (head === originMain) return "This branch is origin/main: there is nothing to push, so nothing to go back from.";
  if (!isAncestor) {
    return "origin/main is not an ancestor of this branch, so the push would not simply follow it. " +
      "Rebase first (git fetch origin && git rebase origin/main), then record the way back.";
  }
  return null;
}

/**
 * What `release.mjs check` says about the way back.
 * @param {{ path: string, recorded: WayBack | null, originMain: string | null, onMain: WayBack | null }} at
 * @returns {{ ok: boolean, text: string, fix?: string }}
 */
export function wayBackVerdict({ path, recorded, originMain, onMain }) {
  const fix = "node scripts/release.mjs back";
  if (!recorded) return { ok: false, text: `${path} records no way back`, fix };
  const named = `${recorded.sha.slice(0, 8)} ${recorded.subject}`;
  if (!originMain) return { ok: true, text: `the way back is ${named} (origin/main is not known here)` };
  if (originMain.startsWith(recorded.sha)) return { ok: true, text: `the way back is ${named}, origin/main as of the last fetch` };
  if (onMain && onMain.sha === recorded.sha) return { ok: true, text: `the push is out, and its way back is ${named}` };
  return {
    ok: false,
    text: `the way back names ${recorded.sha.slice(0, 8)}, but origin/main is ${originMain.slice(0, 8)} now (as of the last fetch)`,
    fix,
  };
}
