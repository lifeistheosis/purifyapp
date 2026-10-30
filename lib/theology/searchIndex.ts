import "server-only";

import { APOLOGETICS_TOPICS } from "@/lib/apologetics/topics";
import { loadApologeticsBody } from "@/lib/apologetics/load";
import { COUNCILS } from "@/lib/councils/councils";
import { HERESIES } from "@/lib/heresies/heresies";
import { getSaint } from "@/lib/saints/saints";
import { loadAllTopics } from "@/lib/topics/topics";

import { loadTopicBody, saintsCitedIn } from "./load";
import type { TheologySearchItem } from "./searchKinds";
import { THEOLOGY_TOPICS } from "./topics";

/**
 * What the theology library's search reads (1.8, round 3 r3-04): every
 * doctrine, question, heresy and apologetic, the Seven Councils, and the
 * Fathers the doctrines quote. The same list the hub's search field held
 * since 1.5, in the same order.
 *
 * The search moved from the foot of the hub into a pill that floats above
 * the tab bar on every Theology screen (the owner's pick C for the foot,
 * 2026-10-30; his note 24 of build 80: "Search the library" was "literally
 * all the way at the bottom"). A list handed to a pill on every one of those
 * pages would be written into each of them, so it is one file instead,
 * app/theology-search.json, fetched when the pill is first opened, as the
 * command palette fetches app/search-corpus.json.
 */

export async function buildTheologySearch(): Promise<TheologySearchItem[]> {
  const [topics, doctrine, apologetics] = await Promise.all([
    loadAllTopics(),
    Promise.all(
      THEOLOGY_TOPICS.filter((t) => !t.planned).map(async (meta) => ({ meta, body: await loadTopicBody(meta.slug) })),
    ),
    Promise.all(
      APOLOGETICS_TOPICS.filter((t) => !t.planned).map(async (meta) => ({ meta, body: await loadApologeticsBody(meta.slug) })),
    ),
  ]);

  // The Fathers the doctrines quote, in the order they are first quoted.
  const fathers: string[] = [];
  for (const { body } of doctrine) {
    if (!body) continue;
    for (const s of saintsCitedIn(body)) if (!fathers.includes(s.saintSlug)) fathers.push(s.saintSlug);
  }

  return [
    ...doctrine.map(({ meta }) => ({
      slug: meta.slug,
      title: meta.title,
      href: `/theology/${meta.slug}`,
      section: "Doctrine" as const,
      summary: meta.summary,
    })),
    ...topics.map((t) => ({
      slug: t.slug,
      title: t.title,
      href: `/topics/${t.slug}`,
      section: "Topics" as const,
      summary: t.definition,
    })),
    ...HERESIES.map((h) => ({
      slug: h.slug,
      title: h.name,
      href: `/heresies/${h.slug}`,
      section: "Heresies" as const,
      summary: h.shortBio,
    })),
    ...apologetics
      .filter(({ body }) => Boolean(body))
      .map(({ meta }) => ({
        slug: meta.slug,
        title: meta.title,
        href: `/apologetics/${meta.slug}`,
        section: "Apologetics" as const,
        summary: meta.summary,
      })),
    ...COUNCILS.filter((c) => c.kind !== "local").map((c) => ({
      slug: c.slug,
      title: c.byname,
      href: `/councils/${c.slug}`,
      section: "Councils" as const,
      summary: c.shortBio,
    })),
    ...fathers.flatMap((slug) => {
      const s = getSaint(slug);
      return s ? [{ slug: s.slug, title: s.name, href: `/saints/${s.slug}`, section: "Fathers" as const, summary: s.byname ?? s.epithet }] : [];
    }),
  ];
}
