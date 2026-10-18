import "server-only";

import fs from "node:fs";
import path from "node:path";

import { getBook } from "@/lib/bible/books";
import { ENTRIES, SUBJECTS, bylineOf, type WorkKey } from "@/lib/reading/entries";
import { workHref } from "@/lib/reading/workHref";
import { divisionsOf, placeAt, placeWords } from "@/lib/saints/divisions";
import type { Section, WritingContent } from "@/lib/saints/load";
import { SAINTS } from "@/lib/saints/saints";

import { markOf, placeOf, scriptureHref, scriptureReference, type Cite, type ShownCite, type WorkCite } from "./cite";

export { markOf, placeOf };

/**
 * A quotation's line, resolved on the server (1.8): from where the data says
 * the words stand (lib/citations/cite.ts) to what the line under them shows
 * and where it opens. The author, the work's title, its numbering and its
 * edition are read from the registry, the work's own file and its divisions
 * (lib/saints/divisions.ts), never typed beside the quotation.
 *
 * The same pieces the reading room's collections show under a passage, and
 * the collections are resolved here too (lib/reading/collectionView.ts).
 */

const DATA = path.join(process.cwd(), "data", "saints");
const files = new Map<string, WritingContent | null>();

/** A work's file, read once. */
export function workFile(saint: string, work: string): WritingContent | null {
  const key = `${saint}/${work}`;
  if (!files.has(key)) {
    try {
      files.set(key, JSON.parse(fs.readFileSync(path.join(DATA, saint, `${work}.json`), "utf8")) as WritingContent);
    } catch {
      files.set(key, null);
    }
  }
  return files.get(key) ?? null;
}

/**
 * The edition, as a citation names it, read from a work's source line where
 * its divisions do not name it: "NPNF II 4", "ANF 1".
 */
export function editionFromSource(source: string | undefined): string | undefined {
  if (!source) return undefined;
  const npnf = /Nicene and Post-Nicene Fathers,? Series (\d|I{1,2}),? Vol(?:ume|\.)? ?(\d+)/i.exec(source) ?? /NPNF,? Series (I{1,2}|\d),? Vol(?:ume|\.)? ?(\d+)/i.exec(source);
  if (npnf) return `NPNF ${npnf[1] === "1" ? "I" : npnf[1] === "2" ? "II" : npnf[1].toUpperCase()} ${npnf[2]}`;
  const anf = /Ante-Nicene Fathers,? Vol(?:ume|\.)? ?(\d+)/i.exec(source);
  if (anf) return `ANF ${anf[1]}`;
  return undefined;
}

/**
 * The author, as the cover says him: the work's author; nobody for a work no
 * one signed or one about its saint (the Martyrdom of Polycarp is the Church
 * of Smyrna's letter); the saint whose page it is on for a work the room has
 * no word on.
 */
function authorOf(saint: string, work: string): string {
  const entry = ENTRIES[`${saint}/${work}` as WorkKey];
  if (!entry) return SAINTS.find((s) => s.slug === saint)?.name ?? "";
  const line = bylineOf(entry);
  if (line.kind !== "by" || !line.slug) return "";
  return SAINTS.find((s) => s.slug === line.slug)?.name ?? SUBJECTS[line.slug]?.name ?? "";
}

/** A paragraph of a work in the library, as its line shows it, or null when it is not there. */
export function shownWork(c: Omit<WorkCite, "kind">): Extract<ShownCite, { kind: "father" }> | null {
  const content = workFile(c.saint, c.work);
  if (!content) return null;
  const section = content.sections.find((s: Section) => s.n === c.section);
  const paragraph = section?.paragraphs[c.paragraph];
  if (!section || paragraph === undefined) return null;
  const key = `${c.saint}/${c.work}`;
  const d = divisionsOf(key, content);
  const place = d ? placeAt(d, content, c.section, c.paragraph) : null;
  const title = SAINTS.find((s) => s.slug === c.saint)?.works.find((w) => w.slug === c.work)?.title ?? content.title;
  const edition = d?.edition ?? editionFromSource(content.source);
  const href = `${workHref(c.saint, c.work)}#p-${c.section}-${c.paragraph}`;
  if (d && place) {
    const words = placeWords(d, place.path, section.title, placeOf);
    return { kind: "father", href, author: authorOf(c.saint, c.work), work: title, ...words, ...(edition ? { edition } : {}) };
  }
  // A selection's section often names its source's own place ("Procatechesis
  // 1, 5-6 (NPNF II.7)"), which says more than its title; a citation with no
  // number in it only restates the work, and the title is kept.
  const cited = section.citation && /d/.test(section.citation) ? section.citation : null;
  const mark = markOf(paragraph);
  return {
    kind: "father",
    href,
    author: authorOf(c.saint, c.work),
    work: title,
    place: cited ?? placeOf(section.title),
    ...(mark ? { mark } : {}),
    ...(edition && !cited ? { edition } : {}),
  };
}

/** Any quotation's line, or null when the place it names is not in the app. */
export function shownCite(c: Cite): ShownCite | null {
  switch (c.kind) {
    case "scripture": {
      const book = getBook(c.book);
      if (!book) return null;
      return {
        kind: "scripture",
        href: scriptureHref(c),
        book: c.book,
        reference: scriptureReference(c),
        translation: book.source === "kjv-pd" ? "kjv" : "brenton",
      };
    }
    case "work":
      return shownWork(c);
    case "text":
      return { kind: "text", author: c.author, work: c.work, place: c.place, edition: c.edition };
    case "inexact": {
      const of = shownCite(c.of);
      return of && (of.kind === "scripture" || of.kind === "father") ? { kind: "inexact", of } : null;
    }
    case "untraced":
      return { kind: "untraced" };
  }
}
