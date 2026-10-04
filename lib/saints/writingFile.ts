import "server-only";

import { loadWriting, type WritingContent } from "./load";
import { SAINTS } from "./saints";

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
 */

/** Every (saint, "<work>.json") a build writes: one per work in the registry. */
export function writingFiles(): { slug: string; file: string }[] {
  return SAINTS.flatMap((s) => s.works.map((w) => ({ slug: s.slug, file: `${w.slug}.json` })));
}

/** "on-the-incarnation.json" to "on-the-incarnation"; null for anything that is not a work file's name. */
export function workOfFile(file: string): string | null {
  const m = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/.exec(file);
  return m ? m[1] : null;
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
