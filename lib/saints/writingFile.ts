import "server-only";

import { COMMENTARY_WORKS } from "@/lib/bible/commentaryWorks";

import { loadWriting, type WritingContent } from "./load";
import { SAINTS } from "./saints";
import { parseWorkFileName, splitWork, workFileName, type PartSection, type WholeWork, type WorkIndex } from "./writingParts";

/**
 * A work of the Fathers, whole, as a file of its own: what the apps read
 * (app/saints-data/, components/saints/LazyWritingReader.tsx).
 *
 * The reader is a client component, and the page used to hand it the whole
 * work as a prop. Next writes a prop into the page's HTML and again into the
 * payload the app reads between pages, so St. Gregory's Morals on Job, 4.2 MB
 * of text, was a 4.4 MB page and a second 4.2 MB file to show a list of
 * section titles. In the apps the page now carries the title, and the reader
 * fetches the work from the bundle when the page opens: the text once, where
 * it was there twice or three times.
 *
 * The website is unchanged: the work stays in the page, where a search engine
 * reads the Fathers' own words. The same choice as the chapter commentary
 * (lib/bible/chapterExtras.ts).
 *
 * From 1.9 a work the Bible's commentary quotes (lib/bible/commentaryWorks.ts)
 * is written as an index and parts, so a chapter's notes are cut out of the
 * work and its words are in the apps once (lib/saints/writingParts.ts). Every
 * other work is whole in its one file, as before. A reader goes through
 * lib/saints/writingClient.ts and never needs to know which it met.
 */

/** Whether a work is written as an index and parts: the ones the commentary quotes. */
export function isInParts(slug: string, work: string): boolean {
  return Object.hasOwn(COMMENTARY_WORKS, `${slug}/${work}`);
}

/** Every (saint, "<work>.json") a build writes: one per work in the registry, whole or as an index. */
export function writingFiles(): { slug: string; file: string }[] {
  return SAINTS.flatMap((s) => s.works.map((w) => ({ slug: s.slug, file: workFileName(w.slug) })));
}

/** The parts of every work written in parts: "<work>.p0.json", "<work>.p1.json" and on. */
export async function writingPartFiles(): Promise<{ slug: string; file: string }[]> {
  const files: { slug: string; file: string }[] = [];
  for (const s of SAINTS) {
    for (const w of s.works) {
      if (!isInParts(s.slug, w.slug)) continue;
      const split = await workInParts(s.slug, w.slug);
      split?.parts.forEach((_, part) => files.push({ slug: s.slug, file: workFileName(w.slug, part) }));
    }
  }
  return files;
}

/** "on-the-incarnation.json" to "on-the-incarnation"; null for anything that is not a whole work's (or an index's) name. */
export function workOfFile(file: string): string | null {
  const named = parseWorkFileName(file);
  return named && named.part === null ? named.work : null;
}

const split = new Map<string, Promise<{ index: WorkIndex; parts: PartSection[][] } | null>>();

/** A quoted work as its index and parts; null when there is no such work. Kept, since a build asks once a part. */
export function workInParts(slug: string, work: string): Promise<{ index: WorkIndex; parts: PartSection[][] } | null> {
  const key = `${slug}/${work}`;
  let asked = split.get(key);
  if (!asked) {
    asked = writingFile(slug, work).then((whole) => (whole ? splitWork(whole as unknown as WholeWork) : null));
    split.set(key, asked);
  }
  return asked;
}

/**
 * What the file of this name holds, as the route answers it: a whole work, a
 * quoted work's index, or one of its parts. Null for a name that is none.
 */
export async function writingFileNamed(slug: string, file: string): Promise<WritingContent | WorkIndex | PartSection[] | null> {
  const named = parseWorkFileName(file);
  if (!named) return null;
  if (!isInParts(slug, named.work)) return named.part === null ? writingFile(slug, named.work) : null;
  const parts = await workInParts(slug, named.work);
  if (!parts) return null;
  return named.part === null ? parts.index : (parts.parts[named.part] ?? null);
}

/** The work in English, as the reader takes it, or null when there is no such work. */
export async function writingFile(slug: string, work: string): Promise<WritingContent | null> {
  if (!SAINTS.some((s) => s.slug === slug && s.works.some((w) => w.slug === work))) return null;
  const content = await loadWriting(slug, work, "en");
  if (!content) return null;
  const { isLocalized, ...text } = content;
  void isLocalized;
  return text;
}
