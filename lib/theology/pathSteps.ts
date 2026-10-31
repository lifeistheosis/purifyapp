import "server-only";

import { COUNCILS } from "@/lib/councils/councils";
import { councilFocus, councilPicture } from "@/lib/councils/page";
import { HERESIES } from "@/lib/heresies/heresies";
import { getSaint } from "@/lib/saints/saints";
import { loadAllTopics } from "@/lib/topics/topics";

import { loadTopicBody } from "./load";
import { fatherGroups } from "./page";
import { splitParts } from "./parts";
import { firstSentence, readIdOf, type PathRead, type PathStep } from "./path";
import { THEOLOGY_SUBJECTS } from "./subjects";
import { getTopicMeta } from "./topics";

/**
 * The nine steps of Theology's path (1.8, round 3 r3-13, lib/theology/
 * path.ts), built from the registries as the pages build: in each step the
 * question first, with its short answer, then the long studies, the errors
 * the Church named and the councils that settled them, each with its own
 * title, so a renamed study leaves no stale label behind.
 *
 * A study wears the face of the Father it quotes most (B's "studies as cards
 * wearing the face of the Father each quotes most"), a council its own
 * picture, History's (lib/councils/page.ts). `native` is IS_STATIC_EXPORT,
 * which decides where a council's picture is asked of.
 */
export async function pathSteps(native: boolean): Promise<PathStep[]> {
  const topics = await loadAllTopics();
  return Promise.all(
    THEOLOGY_SUBJECTS.map(async (s, i): Promise<PathStep> => {
      const reads: PathRead[] = [];
      let short: string | undefined;

      for (const slug of s.topics) {
        const topic = topics.find((t) => t.slug === slug);
        if (!topic) continue;
        short ??= firstSentence(topic.definition);
        reads.push({ id: readIdOf.question(slug), kind: "question", href: `/topics/${slug}`, title: topic.title, citations: topic.citations.length });
      }

      for (const slug of s.studies) {
        const meta = getTopicMeta(slug);
        if (!meta || meta.planned) continue;
        const body = await loadTopicBody(slug);
        const top = body ? fatherGroups(body.florilegium).find((g) => g.saintSlug) : undefined;
        const saint = top?.saintSlug ? getSaint(top.saintSlug) : null;
        reads.push({
          id: readIdOf.study(slug),
          kind: "study",
          href: `/theology/${slug}`,
          title: meta.title,
          ...(meta.estimatedMinutes ? { minutes: meta.estimatedMinutes } : {}),
          ...(body ? { parts: splitParts(body.essay).length } : {}),
          ...(saint ? { father: { slug: saint.slug, name: saint.name, ...(saint.iconUrl ? { iconUrl: saint.iconUrl } : {}) } } : {}),
        });
      }

      for (const slug of s.heresies) {
        const h = HERESIES.find((x) => x.slug === slug);
        if (h) reads.push({ id: readIdOf.error(slug), kind: "error", href: `/heresies/${slug}`, title: h.name, era: h.era });
      }

      for (const slug of s.councils) {
        const c = COUNCILS.find((x) => x.slug === slug);
        if (!c) continue;
        const picture = councilPicture(slug, native);
        reads.push({
          id: readIdOf.council(slug),
          kind: "council",
          href: `/councils/${slug}`,
          title: c.byname,
          year: c.year,
          ...(picture ? { picture: { src: picture.src, ...(picture.preview ? { preview: picture.preview } : {}), focus: councilFocus(slug) } } : {}),
        });
      }

      return { id: s.id, n: i + 1, title: s.title, line: s.line, picture: s.picture, ...(short ? { short } : {}), reads };
    }),
  );
}
