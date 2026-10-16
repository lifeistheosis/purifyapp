// A prayer's words as the reader sets them (1.7): stanzas of lines, the way
// the lyrics of a chant are set in Now Playing.
//
// The owner, 2026-10-16: the prayer flows down the page line by line, the
// line being read bright and the rest a step back, and where the faithful
// make the sign of the Cross the app's drawn cross stands beside that line.
//
// The lines are the text's own. A prayer file keeps a printed text's breaks:
// "\n" between the lines of a psalm or a stanza, a blank line between
// stanzas. Nothing here splits a paragraph into sentences or joins two
// lines, so what is read is laid out as the edition laid it out.
//
// Pure, so lib/prayers/__tests__/cross.test.ts reads it with no DOM.

export type PrayerLine = {
  text: string;
  /** The sign of the Cross is made at this line. */
  cross: boolean;
};

function normalize(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/** True when `line` opens with one of the marks' words. */
function marked(line: string, cross: readonly string[]): boolean {
  return cross.some((words) => words.trim() !== "" && line.startsWith(words.trim()));
}

/**
 * The text as stanzas of lines. A blank line parts two stanzas; a single
 * break parts two lines of one. Empty lines are dropped, and each line is
 * trimmed of the spaces a file may carry at its ends.
 */
export function stanzasOf(text: string, cross: readonly string[] = []): PrayerLine[][] {
  return normalize(text)
    .split(/\n[ \t]*\n+/)
    .map((stanza) =>
      stanza
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .map((line) => ({ text: line, cross: marked(line, cross) })),
    )
    .filter((stanza) => stanza.length > 0);
}

/** Every line of the text, in order. */
export function linesOf(text: string): string[] {
  return stanzasOf(text).flat().map((l) => l.text);
}

/**
 * How many lines of the text each mark's words open. A mark that opens none
 * points at nothing, and one that opens two is ambiguous: the test for the
 * prayer files holds every mark to exactly one.
 */
export function crossMatches(text: string, cross: readonly string[]): { words: string; lines: number }[] {
  const lines = linesOf(text);
  return cross.map((words) => ({
    words,
    lines: lines.filter((line) => words.trim() !== "" && line.startsWith(words.trim())).length,
  }));
}

/**
 * Whether a rubric tells the reader to make the sign of the Cross. Read in
 * the languages prayer files are kept in (English and German), and in the
 * rubric's own words: the title "The Sign of the Cross" (Das Zeichen des
 * Kreuzes) over a prayer whose instruction says how it is made, or "make the
 * Sign of the Cross", "prayed with the sign of the Cross", "Bekreuzigen Sie
 * sich" in an instruction or a rule's opening words.
 */
export function rubricMakesTheCross(words: string | undefined): boolean {
  if (!words) return false;
  return /\bsign of the cross\b|\bzeichen des kreuzes\b|\bbekreuzig/i.test(words);
}
