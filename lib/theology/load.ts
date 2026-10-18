// Loader for a theology topic's full body, read at request time from
// data/theology/<slug>.json. The registry in topics.ts is the index;
// this is the body.

import fs from "node:fs/promises";
import path from "node:path";

import type { Cite } from "@/lib/citations/cite";

import { THEOLOGY_TOPICS, type TheologyGroup } from "./topics";

/** One paragraph in the framing essay. */
export type EssayBlock =
  | { kind: "para"; text: string }
  | { kind: "heading"; text: string; level?: 2 | 3 }
  | {
      kind: "blockquote";
      text: string;
      source?: string;
      /**
       * Where the words stand in the app, exactly (1.8, lib/citations/cite.ts):
       * the verses of its Bible, a paragraph of a work in the library, a
       * section of a council's document. Its line opens there; `source` is
       * kept, and shown where there is no `cite`.
       */
      cite?: Cite;
    }
  | { kind: "list"; items: string[] };

/** One verbatim patristic quotation. */
export type Quotation = {
  /** The Father's printed name as it appears in the source. */
  author: string;
  /** Slug of the saint's profile (lib/saints), if linkable. */
  saintSlug?: string;
  /** Title of the work the quote is drawn from. */
  work?: string;
  /** Section, book, chapter, hymn, paragraph, printed as a small caption. */
  reference?: string;
  /** Verbatim English. */
  text: string;
  /** Optional verbatim original-language text. */
  original?: string;
  /** Language tag for the original, used to set the dir/lang attribute. */
  originalLanguage?: "greek" | "latin" | "syriac" | "hebrew";
  /** Editorial commentary tying the quote to the argument. */
  gloss?: string;
  /** PD source URL (NPNF, ANF, CCEL, NewAdvent, Patrologia). */
  source?: string;
  /**
   * Where the words stand in the app, or that they do not (1.8,
   * lib/citations/cite.ts): a paragraph of a work in the library, the
   * passage they are close to ("Not word for word"), or the plain word that
   * no public-domain text we can read carries them. An entry with none was
   * read word for word on its `source` page (scripts/audit-florilegium.mjs).
   */
  cite?: Cite;
};

/** A council citation. */
export type CouncilCitation = {
  name: string;
  year: string;
  /** Slug into lib/councils (when present). */
  councilSlug?: string;
  /** Specific session, canon, anathema. */
  reference?: string;
  /** What the council said, summarized or quoted. */
  text: string;
  /** Editorial commentary tying the council to the argument. */
  gloss?: string;
  /** Where the words stand in the council's own document in the app, or that they do not (1.8). */
  cite?: Cite;
};

/** A scripture cross-reference shown in the side rail. */
export type ScriptureRef = {
  /** Human-readable reference, e.g. "John 15:26". */
  ref: string;
  /** Routing reference, e.g. "John 15:26" parseable by /bible. */
  bibleRef?: string;
  /** Editorial note on why the verse is cited. */
  note?: string;
};

export type TheologyBody = {
  slug: string;
  title: string;
  subtitle?: string;
  group: TheologyGroup;
  summary: string;
  /** Short editorial provenance (writer, reviewer). */
  curatedBy?: string;
  /** ISO date for editorial accountability. */
  curatedOn?: string;
  /** Source channel + thread that started the study. */
  origin?: string;
  essay: EssayBlock[];
  florilegium: Quotation[];
  councils?: CouncilCitation[];
  scripture?: ScriptureRef[];
  /** Slugs of related theology topics. */
  related?: string[];
};

const DATA_DIR = path.join(process.cwd(), "data", "theology");

/**
 * What a reader is shown of a study (1.8). The owner, 2026-10-18: "Whatever
 * stays untraced is hidden from readers, not shown with a label." A line no
 * public-domain text we can read carries word for word (cite "untraced")
 * stays in the file with where we looked, so it can come back once sourced,
 * and is left out here: from the quotations, the councils, and the saints
 * the page names as cited.
 */
export function shownOnly<B extends { florilegium: Quotation[]; councils?: CouncilCitation[] }>(body: B): B {
  return {
    ...body,
    florilegium: body.florilegium.filter((q) => q.cite?.kind !== "untraced"),
    ...(body.councils ? { councils: body.councils.filter((c) => c.cite?.kind !== "untraced") } : {}),
  };
}

export async function loadTopicBody(slug: string): Promise<TheologyBody | null> {
  const meta = THEOLOGY_TOPICS.find((t) => t.slug === slug);
  if (!meta || meta.planned) return null;
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${slug}.json`), "utf8");
    return shownOnly(JSON.parse(raw) as TheologyBody);
  } catch {
    return null;
  }
}

/** Saints cited in a topic, deduplicated, in first-appearance order. */
export function saintsCitedIn(body: TheologyBody): {
  saintSlug: string;
  author: string;
}[] {
  const seen = new Set<string>();
  const out: { saintSlug: string; author: string }[] = [];
  for (const q of body.florilegium) {
    if (!q.saintSlug || seen.has(q.saintSlug)) continue;
    seen.add(q.saintSlug);
    out.push({ saintSlug: q.saintSlug, author: q.author });
  }
  return out;
}
