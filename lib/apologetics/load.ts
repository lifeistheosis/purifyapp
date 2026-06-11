// Loader for an apologetics entry's full body, read at request time from
// data/apologetics/<slug>.json. The registry in topics.ts is the index.
//
// The content block types (essay, quotation, council, scripture) are shared
// with the theology vertical, so they are re-exported from there rather than
// duplicated. Every verbatim quotation must keep its source, exactly as in
// theology; the framing essay is in-house Orthodox prose.

import fs from "node:fs/promises";
import path from "node:path";

import type {
  EssayBlock,
  Quotation,
  CouncilCitation,
  ScriptureRef,
} from "@/lib/theology/load";
import { APOLOGETICS_TOPICS, type ApologeticsGroup } from "./topics";

export type { EssayBlock, Quotation, CouncilCitation, ScriptureRef };

export type ApologeticsBody = {
  slug: string;
  title: string;
  subtitle?: string;
  group: ApologeticsGroup;
  summary: string;
  curatedBy?: string;
  curatedOn?: string;
  origin?: string;
  essay: EssayBlock[];
  florilegium: Quotation[];
  councils?: CouncilCitation[];
  scripture?: ScriptureRef[];
  /** Slugs of related apologetics entries. */
  related?: string[];
};

const DATA_DIR = path.join(process.cwd(), "data", "apologetics");

export async function loadApologeticsBody(
  slug: string,
): Promise<ApologeticsBody | null> {
  const meta = APOLOGETICS_TOPICS.find((t) => t.slug === slug);
  if (!meta || meta.planned) return null;
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${slug}.json`), "utf8");
    return JSON.parse(raw) as ApologeticsBody;
  } catch {
    return null;
  }
}

/** Saints cited in an entry, deduplicated, in first-appearance order. */
export function saintsCitedIn(
  body: ApologeticsBody,
): { saintSlug: string; author: string }[] {
  const seen = new Set<string>();
  const out: { saintSlug: string; author: string }[] = [];
  for (const q of body.florilegium) {
    if (!q.saintSlug || seen.has(q.saintSlug)) continue;
    seen.add(q.saintSlug);
    out.push({ saintSlug: q.saintSlug, author: q.author });
  }
  return out;
}
