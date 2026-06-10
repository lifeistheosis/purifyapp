// Loader for a theology topic's full body, read at request time from
// data/theology/<slug>.json. The registry in topics.ts is the index;
// this is the body.

import fs from "node:fs/promises";
import path from "node:path";

import { THEOLOGY_TOPICS, type TheologyGroup } from "./topics";

/** One paragraph in the framing essay. */
export type EssayBlock =
  | { kind: "para"; text: string }
  | { kind: "heading"; text: string; level?: 2 | 3 }
  | { kind: "blockquote"; text: string; source?: string }
  | { kind: "list"; items: string[] };

/** One verbatim patristic quotation. */
export type Quotation = {
  /** The Father's printed name as it appears in the source. */
  author: string;
  /** Slug of the saint's profile (lib/saints), if linkable. */
  saintSlug?: string;
  /** Title of the work the quote is drawn from. */
  work?: string;
  /** Section, book, chapter, hymn, paragraph — printed as a small caption. */
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

export async function loadTopicBody(slug: string): Promise<TheologyBody | null> {
  const meta = THEOLOGY_TOPICS.find((t) => t.slug === slug);
  if (!meta || meta.planned) return null;
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${slug}.json`), "utf8");
    return JSON.parse(raw) as TheologyBody;
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
