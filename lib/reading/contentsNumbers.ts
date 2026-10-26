/**
 * The numbers a work's contents show beside its section titles (1.8, the
 * owner's screenshot of the Confessions' contents of 2026-10-26: "1 Book I",
 * then "102 Book II" to "113 Book XIII", the file's own section numbers,
 * kept past the anchors Book I once had).
 *
 * Each section's number as the edition prints it where the work keeps its
 * divisions (lib/saints/divisions.ts: "II", "1.4", "III.10"; "" for a
 * section it does not number), else the file's own count. When every title
 * already says its number ("Book II", "Homily 8, Matthew 2:11", "Hymn XIX"),
 * the titles stand alone and this returns null.
 */
export function contentsNumbers(sections: readonly { title: string; label: string }[]): string[] | null {
  if (sections.every((s) => !s.label || titleSays(s.title, s.label))) return null;
  return sections.map((s) => s.label);
}

/** Whether a title holds the number as one of its words: "Book II" holds "II", "Book III" does not. */
export function titleSays(title: string, label: string): boolean {
  return title.split(/[\s,;]+/).some((word) => word.replace(/[.:]$/, "") === label);
}
