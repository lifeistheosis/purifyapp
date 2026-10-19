// Shared citation resolver. Lifted out of the Topics page so the Topics
// index and the Heresies archive resolve deep-link citations identically:
// look up the saint, load the work, find the section, take the cited
// paragraph, and hand back everything a card needs to render. Returns null
// when any link in the chain is missing, so callers can silently drop
// unresolvable citations rather than fabricate text.
//
// 1.8: the card quotes only a Father's own words, and names their exact
// place. The cited paragraph, or the section's first paragraph of the
// author's own text: never the edition's chapter heading (the NPNF synopses
// that open many of Athanasius's chapters, lib/saints/divisions.ts), never a
// section in Purify's voice, and nothing at all from a work the reading room
// calls a retelling or that no one signed (our summaries of Cyril's Five
// Tomes and Epistles, the florilegium on St Gregory Palamas's page). For
// those the card keeps its gloss and its line, and quotes nothing. The line
// is the one every quotation in the app has (lib/citations/cite.ts), and the
// card opens the paragraph itself, not the top of its section.

import "server-only";
import type { TopicCitation } from "@/lib/topics/topics";
import { loadWriting } from "@/lib/saints/load";
import { getSaint } from "@/lib/saints/saints";
import { bylineOf, entryFor } from "@/lib/reading/entries";
import { divisionsOf } from "@/lib/saints/divisions";

import type { ShownCite } from "./cite";
import { shownWork } from "./shown";

export type ResolvedCitation = {
  saintName: string;
  saintIcon?: string;
  workTitle: string;
  sectionTitle?: string;
  citation?: string;
  /** The Father's own words the card quotes; null when the cited text is not his words. */
  paragraph: string | null;
  href: string;
  gloss?: string;
  /** Where the words stand, as every quotation's line names it. */
  cite: ShownCite | null;
};

/** Resolve one citation into the data needed to render its card, or null. */
export async function resolveCitation(
  c: TopicCitation,
): Promise<ResolvedCitation | null> {
  const saint = getSaint(c.saintSlug);
  if (!saint) return null;
  const writing = await loadWriting(c.saintSlug, c.workSlug);
  if (!writing) return null;
  const sectionIndex = writing.sections.findIndex((s) => s.n === c.sectionN);
  const section = writing.sections[sectionIndex];
  if (!section) return null;

  const entry = entryFor(`${c.saintSlug}/${c.workSlug}`);
  const hisWords = !entry || (entry.form !== "retelling" && bylineOf(entry).kind === "by");
  const d = divisionsOf(`${c.saintSlug}/${c.workSlug}`, writing);
  const isHeading = (i: number) => Boolean(d?.places[sectionIndex]?.[i]?.synopsis);
  let index: number | null = null;
  if (hisWords && section.voice !== "editorial") {
    if (typeof c.paragraphIndex === "number") index = isHeading(c.paragraphIndex) ? null : c.paragraphIndex;
    else {
      const first = section.paragraphs.findIndex((_, i) => !isHeading(i));
      index = first >= 0 ? first : null;
    }
  }
  const at = index ?? 0;
  const cite = shownWork({ saint: c.saintSlug, work: c.workSlug, section: c.sectionN, paragraph: at });
  return {
    saintName: saint.name,
    saintIcon: saint.iconUrl,
    workTitle: writing.title,
    sectionTitle: section.title,
    citation: section.citation,
    paragraph: index === null ? null : section.paragraphs[index] ?? null,
    href: index === null ? `/saints/${c.saintSlug}/${c.workSlug}#s${c.sectionN}` : `/saints/${c.saintSlug}/${c.workSlug}#p-${c.sectionN}-${index}`,
    gloss: c.gloss,
    cite: cite ? (index === null ? { ...cite, href: `/saints/${c.saintSlug}/${c.workSlug}#s${c.sectionN}` } : cite) : null,
  };
}

/** Resolve a list of citations, dropping any that don't resolve. */
export async function resolveCitations(
  citations: TopicCitation[],
): Promise<ResolvedCitation[]> {
  const resolved = await Promise.all(citations.map(resolveCitation));
  return resolved.filter((c): c is ResolvedCitation => c !== null);
}
