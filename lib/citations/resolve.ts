// Shared citation resolver. Lifted out of the Topics page so the Topics
// index and the Heresies archive resolve deep-link citations identically:
// look up the saint, load the work, find the section, take the cited
// paragraph (or the section's first), and hand back everything a card needs
// to render. Returns null when any link in the chain is missing, so callers
// can silently drop unresolvable citations rather than fabricate text.

import "server-only";
import type { TopicCitation } from "@/lib/topics/topics";
import { loadWriting } from "@/lib/saints/load";
import { getSaint } from "@/lib/saints/saints";

export type ResolvedCitation = {
  saintName: string;
  saintIcon?: string;
  workTitle: string;
  sectionTitle?: string;
  citation?: string;
  paragraph: string;
  href: string;
  gloss?: string;
};

/** Resolve one citation into the data needed to render its card, or null. */
export async function resolveCitation(
  c: TopicCitation,
): Promise<ResolvedCitation | null> {
  const saint = getSaint(c.saintSlug);
  if (!saint) return null;
  const writing = await loadWriting(c.saintSlug, c.workSlug);
  if (!writing) return null;
  const section = writing.sections.find((s) => s.n === c.sectionN);
  if (!section) return null;
  const paragraph =
    typeof c.paragraphIndex === "number"
      ? section.paragraphs[c.paragraphIndex]
      : section.paragraphs[0];
  return {
    saintName: saint.name,
    saintIcon: saint.iconUrl,
    workTitle: writing.title,
    sectionTitle: section.title,
    citation: section.citation,
    paragraph: paragraph ?? "",
    href: `/saints/${c.saintSlug}/${c.workSlug}#s${c.sectionN}`,
    gloss: c.gloss,
  };
}

/** Resolve a list of citations, dropping any that don't resolve. */
export async function resolveCitations(
  citations: TopicCitation[],
): Promise<ResolvedCitation[]> {
  const resolved = await Promise.all(citations.map(resolveCitation));
  return resolved.filter((c): c is ResolvedCitation => c !== null);
}
