import "server-only";

import fs from "node:fs";
import path from "node:path";

import { getBook } from "@/lib/bible/books";
import type { Section, WritingContent } from "@/lib/saints/load";
import { SAINTS } from "@/lib/saints/saints";

import { allCards, nameOf } from "./cards";
import { PASSAGES, passageHref, type Passage } from "./collections";
import { ENTRIES, type WorkKey } from "./entries";
import type { CollectionSlug } from "./feelings";
import { tileOf, type TileCard } from "./select";

/**
 * A Purify collection's page, as the server hands it over (1.8): each passage
 * with its words, where it opens, and its exact place, read from the registry
 * and the work itself, never typed (lib/reading/collections.ts). Only what the
 * page shows: the passages, and the books the Fathers' passages come from as
 * covers to open. No word here is in the reader's language: the page looks
 * its words up on the device, and the passages stay in their English.
 */

export type ShownPassage =
  | {
      kind: "scripture";
      text: string;
      href: string;
      book: string;
      /** "13:4-7", the reference after the book's name, which the page says in the reader's language. */
      reference: string;
      translation: "kjv" | "brenton";
    }
  | {
      kind: "father";
      text: string;
      href: string;
      /** The author, as the cover says him. */
      author: string;
      /** The work's title. */
      work: string;
      /** The work's own name for the section: "Book 8, Chapter 17", "Homily 18, Matthew 5:38, 39, 40". */
      place: string;
      /** The edition's own number on the paragraph, where it prints one: "§78". */
      mark?: string;
    };

export type CollectionPageData = {
  slug: CollectionSlug;
  passages: ShownPassage[];
  /** The books the Fathers' passages come from, once each, in the order they first appear. */
  sources: TileCard[];
};

const DATA = path.join(process.cwd(), "data", "saints");
const works = new Map<string, WritingContent>();
function workFile(saint: string, work: string): WritingContent {
  const key = `${saint}/${work}`;
  let content = works.get(key);
  if (!content) {
    content = JSON.parse(fs.readFileSync(path.join(DATA, saint, `${work}.json`), "utf8")) as WritingContent;
    works.set(key, content);
  }
  return content;
}

/**
 * The section's place as the work names it. A title that runs on after its
 * numbers ("Book 8, Chapter 17. That the peace of our heart ...") is cut to
 * them; any other is whole.
 */
export function placeOf(title: string): string {
  const m = /^((?:Book|Conference|Sermon|Homily|Chapter) [0-9IVXLC]+(?:, Chapter [0-9IVXLC]+)?)\. /.exec(title);
  return m ? m[1] : title;
}

/** The number the edition prints at the head of a paragraph ("78. Which same ..."), as "§78". */
export function markOf(paragraph: string): string | undefined {
  const m = /^(\d{1,4})\. /.exec(paragraph);
  return m ? `§${m[1]}` : undefined;
}

function shown(p: Passage): ShownPassage {
  if (p.kind === "scripture") {
    const book = getBook(p.book);
    return {
      kind: "scripture",
      text: p.text,
      href: passageHref(p),
      book: p.book,
      reference: `${p.chapter}:${p.from}${p.to !== undefined ? `-${p.to}` : ""}`,
      translation: book?.source === "kjv-pd" ? "kjv" : "brenton",
    };
  }
  const saint = SAINTS.find((s) => s.slug === p.saint);
  const work = saint?.works.find((w) => w.slug === p.work);
  const entry = ENTRIES[`${p.saint}/${p.work}` as WorkKey];
  const content = workFile(p.saint, p.work);
  const section = content.sections.find((s: Section) => s.n === p.section);
  const paragraph = section?.paragraphs[p.paragraph] ?? "";
  const mark = markOf(paragraph);
  return {
    kind: "father",
    text: p.text,
    href: passageHref(p),
    author: (entry?.by ? nameOf(entry.by) : null) ?? saint?.name ?? "",
    work: work?.title ?? content.title,
    place: section ? placeOf(section.title) : "",
    ...(mark ? { mark } : {}),
  };
}

export function collectionPage(slug: CollectionSlug, native: boolean): CollectionPageData {
  const passages = PASSAGES[slug];
  const cards = new Map(allCards(native).map((c) => [c.key, c]));
  const seen = new Set<string>();
  const sources: TileCard[] = [];
  for (const p of passages) {
    if (p.kind !== "father") continue;
    const key = `${p.saint}/${p.work}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const card = cards.get(key);
    if (card) sources.push(tileOf(card));
  }
  return { slug, passages: passages.map(shown), sources };
}
