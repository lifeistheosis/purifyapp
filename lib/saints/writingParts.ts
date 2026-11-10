// A long work of the Fathers in parts, and a commentary note as a place in it.
//
// The Bible's commentary quotes twenty-three works that the library also
// holds, and the apps carried those words twice: once in each chapter's
// commentary file, once in the work's own file. 4,631 of the 11,994 notes
// were word for word inside their work, 19.8 MB on disk and about 6.8 MB of
// what a phone downloads (the optimization audit of 2026-11-10,
// docs/1.9-build/notes/optimization-fable.md, item 5).
//
// From 1.9 the words are carried once, in the work. A quoted work is written
// as an index and parts of about 32 KB (whole sections, in order), and a note
// that is found whole inside the section it points to is written as a span
// of that section's text: where it starts and how long it is. The reader
// reads the part and cuts the note out of it (lib/saints/writingClient.ts,
// lib/bible/chapterData.ts). A whole 4 MB work is never read to show a note.
//
// Why 32 KB: measured over every chapter, parts of that size make a chapter
// read about what its own commentary file weighed before (the median the
// same, the heaviest chapter 1.1 MB where its file was 0.9), and cost about
// 0.8 MB packed over whole files. Larger parts read two to five times more.
//
// Pure and shared: the build writes with it, the reader reads with it, and
// the tests hold every note to its words (lib/saints/__tests__/writingParts.test.ts).

/** A section as a work's file holds it. Only `n` and `paragraphs` matter here. */
export type PartSection = { n: number; paragraphs: string[]; [key: string]: unknown };

/** A work as its own file holds it, whole. */
export type WholeWork = { sections: PartSection[]; [key: string]: unknown };

/**
 * A quoted work's index: everything but the paragraphs, and where each part
 * begins. `parts[i]` is the place in `sections` of part i's first section.
 */
export type WorkIndex = {
  sections: Omit<PartSection, "paragraphs">[];
  parts: number[];
  [key: string]: unknown;
};

/** About this many bytes of JSON to a part. A section larger than this is a part by itself. */
export const PART_BYTES = 32 * 1024;

/** True for an index (a work in parts), false for a work that is whole in its file. */
export function isWorkIndex(file: unknown): file is WorkIndex {
  return typeof file === "object" && file !== null && Array.isArray((file as WorkIndex).parts);
}

const weight = (section: PartSection) => new TextEncoder().encode(JSON.stringify(section)).length;

/** A work as an index and its parts: whole sections, in order, about PART_BYTES each. */
export function splitWork(work: WholeWork): { index: WorkIndex; parts: PartSection[][] } {
  const parts: PartSection[][] = [];
  const starts: number[] = [];
  let current: PartSection[] = [];
  let size = 0;
  work.sections.forEach((section, at) => {
    const w = weight(section);
    if (current.length > 0 && size + w > PART_BYTES) {
      parts.push(current);
      current = [];
      size = 0;
    }
    if (current.length === 0) starts.push(at);
    current.push(section);
    size += w;
  });
  if (current.length > 0) parts.push(current);
  const { sections, ...meta } = work;
  return {
    index: {
      ...meta,
      sections: sections.map((section) => {
        const { paragraphs, ...rest } = section;
        void paragraphs;
        return rest;
      }),
      parts: starts,
    },
    parts,
  };
}

/** The work whole again, from its index and every part, in order. */
export function joinWork(index: WorkIndex, parts: PartSection[][]): WholeWork {
  const { parts: starts, sections, ...meta } = index;
  void starts;
  void sections;
  return { ...meta, sections: parts.flat() };
}

/** Which part holds the section at this place in the index's list. */
export function partOfPlace(index: WorkIndex, place: number): number {
  let part = 0;
  for (let i = 0; i < index.parts.length; i++) {
    if (index.parts[i] <= place) part = i;
    else break;
  }
  return part;
}

/**
 * Which part holds section `n`, or null. Two works give a number twice (Cyril
 * on Luke, Sermons 29 and 96): the first is meant, as a reader of the whole
 * file finds it, and no commentary note points at either
 * (scripts/place-commentary.mjs).
 */
export function partOfSection(index: WorkIndex, n: number): number | null {
  const place = index.sections.findIndex((section) => section.n === n);
  return place < 0 ? null : partOfPlace(index, place);
}

/** A section's words as one text: what a note's span is counted in. */
export function sectionText(section: Pick<PartSection, "paragraphs">): string {
  return section.paragraphs.join("\n\n");
}

/** [where the note starts in its section's text, how many characters it is]. */
export type NoteSpan = [start: number, length: number];

/** The span of `text` in the section, or null when the section does not hold it whole. */
export function spanOf(section: Pick<PartSection, "paragraphs">, text: string): NoteSpan | null {
  if (!text) return null;
  const start = sectionText(section).indexOf(text);
  return start < 0 ? null : [start, text.length];
}

/** The note's words, cut back out of its section; null when the span runs outside it. */
export function cutSpan(section: Pick<PartSection, "paragraphs">, span: NoteSpan): string | null {
  const text = sectionText(section);
  const [start, length] = span;
  if (!Number.isInteger(start) || !Number.isInteger(length) || start < 0 || length <= 0 || start + length > text.length) return null;
  return text.slice(start, start + length);
}

/** "homilies-on-john.json" for the whole work or its index; "homilies-on-john.p3.json" for a part. */
export function workFileName(work: string, part?: number): string {
  return part === undefined ? `${work}.json` : `${work}.p${part}.json`;
}

/** A file's name back to its work and part, or null for anything else. */
export function parseWorkFileName(file: string): { work: string; part: number | null } | null {
  const m = /^([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.p(0|[1-9]\d{0,3}))?\.json$/.exec(file);
  return m ? { work: m[1], part: m[2] === undefined ? null : Number(m[2]) } : null;
}
