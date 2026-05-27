// Topical Patristic & Apologetics Index (v6.4 PRD §1).
//
// A research surface for enquirers and apologists: type a doctrinal
// term ("the Trinity", "the Filioque"), get a short Orthodox
// definition plus the patristic citations that confess it (or, where
// applicable, that refute its opposite).
//
// The corpus of patristic text already lives in
// data/saints/{slug}/{work}.json as numbered sections of paragraphs.
// This layer is a *thin index* on top of that corpus, each citation
// is a deep-link into a specific paragraph that already exists, never
// a duplicate of its text.

import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export type CitationStance = "affirms" | "refutes";

export type TopicCitation = {
  /** Saint slug, matches /lib/saints/saints.ts. */
  saintSlug: string;
  /** Work slug, matches /data/saints/{saintSlug}/{workSlug}.json. */
  workSlug: string;
  /** 1-based section number inside the work. */
  sectionN: number;
  /**
   * Optional 0-based paragraph index inside the section. When
   * omitted, the section heading is the deep link target.
   */
  paragraphIndex?: number;
  /**
   * Does this citation *confess* the topic, or *refute* the topic's
   * opposite? Drives the two-column layout on the topic page.
   */
  stance: CitationStance;
  /**
   * Optional one-line editorial gloss shown above the pull-quote,
   * giving the reader context for why this citation is relevant. Keep
   * short (~120 chars).
   */
  gloss?: string;
};

export type Topic = {
  slug: string;
  /** User-facing title, e.g. "The Trinity". */
  title: string;
  /**
   * One-paragraph Orthodox definition. Written for an enquirer: plain
   * English, no jargon, no rhetorical flourish. Rendered at the top
   * of the topic page.
   */
  definition: string;
  /**
   * Optional notes on the tradition's framing of the question (e.g.
   * "The Filioque was added to the Western recension of the Nicene
   * Creed in the 9th century..."). Shown below the definition.
   */
  tradition?: string;
  citations: TopicCitation[];
  /**
   * Editorial provenance. Who curated this topic file and when.
   * Optional but encouraged for accountability.
   */
  curatedBy?: string;
  curatedOn?: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "topics");

/** Load every curated topic file. Sorted alphabetically by title. */
export async function loadAllTopics(): Promise<Topic[]> {
  try {
    const entries = await fs.readdir(DATA_DIR);
    const topicFiles = entries.filter(
      (e) => e.endsWith(".json") && !e.startsWith("_"),
    );
    const loaded: Topic[] = [];
    for (const file of topicFiles) {
      try {
        const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
        loaded.push(JSON.parse(raw) as Topic);
      } catch {
        // Skip malformed files rather than blow up the whole index.
      }
    }
    return loaded.sort((a, b) => a.title.localeCompare(b.title));
  } catch {
    return [];
  }
}

/** Load a single curated topic by slug. Returns null if missing. */
export async function loadTopic(slug: string): Promise<Topic | null> {
  try {
    const file = path.join(DATA_DIR, `${slug}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as Topic;
  } catch {
    return null;
  }
}

/** Quick partition of citations by stance for the two-column UI. */
export function partitionCitations(topic: Topic): {
  affirming: TopicCitation[];
  refuting: TopicCitation[];
} {
  const affirming = topic.citations.filter((c) => c.stance === "affirms");
  const refuting = topic.citations.filter((c) => c.stance === "refutes");
  return { affirming, refuting };
}

/** Build the URL fragment for a single citation. */
export function citationHref(c: TopicCitation): string {
  const base = `/saints/${c.saintSlug}/${c.workSlug}`;
  return `${base}#s${c.sectionN}`;
}
