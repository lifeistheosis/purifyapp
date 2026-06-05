// Reading surfaces, server-side helpers that flatten the existing content
// registries (saints/works, councils, heresies, topics) into plain reading
// lists for the Reading Hub. Pure derivations, no new content.

import { SAINTS } from "@/lib/saints/saints";

export type FlatWork = {
 saintSlug: string;
 saintName: string;
 workSlug: string;
 title: string;
 subtitle?: string;
 blurb: string;
 topics: string[];
 href: string;
};

/** Every shipped saint work, flattened with its saint context and route. */
export function allWorks(): FlatWork[] {
 const out: FlatWork[] = [];
 for (const saint of SAINTS) {
 for (const work of saint.works) {
 out.push({
 saintSlug: saint.slug,
 saintName: saint.name,
 workSlug: work.slug,
 title: work.title,
 subtitle: work.subtitle,
 blurb: work.blurb,
 topics: work.topics,
 href: `/saints/${saint.slug}/${work.slug}`,
 });
 }
 }
 return out;
}

/** Resolve a single flattened work by saint+work slug. Null when missing. */
export function findWork(
 saintSlug: string,
 workSlug: string,
): FlatWork | null {
 const saint = SAINTS.find((s) => s.slug === saintSlug);
 if (!saint) return null;
 const work = saint.works.find((w) => w.slug === workSlug);
 if (!work) return null;
 return {
 saintSlug: saint.slug,
 saintName: saint.name,
 workSlug: work.slug,
 title: work.title,
 subtitle: work.subtitle,
 blurb: work.blurb,
 topics: work.topics,
 href: `/saints/${saint.slug}/${work.slug}`,
 };
}

/**
 * Thematic collections, works tagged "Florilegium" (a curated chain of
 * patristic witnesses on one theme). Currently the essence-energies
 * florilegium; surfaces automatically as new ones are tagged.
 */
export function collections(): FlatWork[] {
 return allWorks().filter((w) =>
 w.topics.some((tt) => tt.toLowerCase() === "florilegium"),
 );
}
