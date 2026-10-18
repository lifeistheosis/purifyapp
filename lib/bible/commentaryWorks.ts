import type { ShownCite } from "@/lib/citations/cite";

/**
 * The library works the Bible's commentary is cut from (1.8), as a note's
 * line names them. Each note of these carries `at`, where it begins in the
 * work, written by scripts/place-commentary.mjs; this gives the work's title
 * and edition, so the rail can name the place and open it with no library
 * file in the page. lib/bible/__tests__/commentaryPlaces.test.ts holds the
 * titles to the saints' registry and the editions to the works' divisions
 * (lib/saints/divisions.ts), so they cannot drift.
 */
export const COMMENTARY_WORKS: Readonly<Record<string, { title: string; edition: string }>> = {
  "john-chrysostom/homilies-on-matthew": { title: "Homilies on the Gospel of Matthew", edition: "NPNF I 10" },
  "john-chrysostom/homilies-on-john": { title: "Homilies on the Gospel of John", edition: "NPNF I 14" },
  "john-chrysostom/homilies-on-acts": { title: "Homilies on the Acts of the Apostles", edition: "NPNF I 11" },
  "john-chrysostom/homilies-on-romans": { title: "Homilies on the Epistle to the Romans", edition: "NPNF I 11" },
  "john-chrysostom/homilies-on-1-corinthians": { title: "Homilies on the First Epistle to the Corinthians", edition: "NPNF I 12" },
  "john-chrysostom/homilies-on-2-corinthians": { title: "Homilies on the Second Epistle to the Corinthians", edition: "NPNF I 12" },
  "john-chrysostom/commentary-on-galatians": { title: "Commentary on the Epistle to the Galatians", edition: "NPNF I 13" },
  "john-chrysostom/homilies-on-ephesians": { title: "Homilies on the Epistle to the Ephesians", edition: "NPNF I 13" },
  "john-chrysostom/homilies-on-philippians": { title: "Homilies on the Epistle to the Philippians", edition: "NPNF I 13" },
  "john-chrysostom/homilies-on-colossians": { title: "Homilies on the Epistle to the Colossians", edition: "NPNF I 13" },
  "john-chrysostom/homilies-on-1-thessalonians": { title: "Homilies on the First Epistle to the Thessalonians", edition: "NPNF I 13" },
  "john-chrysostom/homilies-on-2-thessalonians": { title: "Homilies on the Second Epistle to the Thessalonians", edition: "NPNF I 13" },
  "john-chrysostom/homilies-on-1-timothy": { title: "Homilies on the First Epistle to Timothy", edition: "NPNF I 13" },
  "john-chrysostom/homilies-on-2-timothy": { title: "Homilies on the Second Epistle to Timothy", edition: "NPNF I 13" },
  "john-chrysostom/homilies-on-titus": { title: "Homilies on the Epistle to Titus", edition: "NPNF I 13" },
  "john-chrysostom/homilies-on-philemon": { title: "Homilies on the Epistle to Philemon", edition: "NPNF I 13" },
  "john-chrysostom/homilies-on-hebrews": { title: "Homilies on the Epistle to the Hebrews", edition: "NPNF I 14" },
  "cyril-of-alexandria/commentary-on-john": { title: "Commentary on the Gospel of John", edition: "LFC 43 and 48" },
  "cyril-of-alexandria/commentary-on-luke": { title: "Commentary on the Gospel of Luke", edition: "tr. Payne Smith, 1859" },
  "gregory-the-dialogist/morals-on-the-book-of-job": { title: "Morals on the Book of Job", edition: "Oxford, 1844 to 1850" },
  "augustine-of-hippo/harmony-of-the-gospels": { title: "The Harmony of the Gospels", edition: "NPNF I 6" },
  "augustine-of-hippo/sermons-on-selected-lessons": { title: "Sermons on Selected Lessons of the New Testament", edition: "NPNF I 6" },
  "augustine-of-hippo/sermon-on-the-mount": { title: "Our Lord's Sermon on the Mount", edition: "NPNF I 6" },
};

/** Where a commentary note begins in its library work (scripts/place-commentary.mjs). */
export type CommentaryAt = {
  work: string;
  section: number;
  paragraph: number;
  place: string;
  mark?: string;
};

/** "NPNF1-10" as the line says an edition: "NPNF I 10". Any other citation as it stands. */
export function editionOfCitation(citation: string): string {
  const m = /^(NPNF|ANF)(\d)?-?0*(\d+)$/.exec(citation.trim());
  if (!m) return citation.trim();
  if (m[1] === "ANF") return `ANF ${m[3]}`;
  return `NPNF ${m[2] === "2" ? "II" : "I"} ${m[3]}`;
}

/**
 * A commentary note's line (1.8): where it stands in the library, opening
 * there, for a note cut from a work the library holds; else its own heading
 * and edition, as a text the library does not carry (the Catena Aurea, St
 * Augustine on the Psalms). The same line every quotation in the app has.
 */
export function noteCite(note: { author: string; work: string; citation: string; at?: CommentaryAt }): ShownCite {
  const w = note.at ? COMMENTARY_WORKS[note.at.work] : undefined;
  if (note.at && w) {
    return {
      kind: "father",
      href: `/saints/${note.at.work}#p-${note.at.section}-${note.at.paragraph}`,
      author: note.author,
      work: w.title,
      place: note.at.place,
      ...(note.at.mark ? { mark: note.at.mark } : {}),
      edition: w.edition,
    };
  }
  // A heading that already names the edition ("Morals on the Book of Job (Oxford, Parker, 1844)") is not repeated.
  const edition = editionOfCitation(note.citation);
  return { kind: "text", author: note.author, work: note.work, place: "", edition: note.work.includes(edition) ? "" : edition };
}
