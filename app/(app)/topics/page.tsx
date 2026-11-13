import Link from "next/link";

import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { WayPage } from "@/components/theology/WayPage";
import { WholeIcon } from "@/components/theology/WholeIcon";
import { WAY_TITLE } from "@/components/theology/wayStyle";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { firstSentence } from "@/lib/theology/path";
import { THEOLOGY_SUBJECTS } from "@/lib/theology/subjects";
import { wayCounts } from "@/lib/theology/wayCounts";
import { loadAllTopics } from "@/lib/topics/topics";

export const metadata = {
  title: "Topics",
  description:
    "A reference index for enquirers and apologists: doctrinal topics with their Orthodox definition and the patristic citations that confess them.",
};

export const revalidate = 3600;

/**
 * Topics, the questions answered (1.9, build 89 note 2: the page behind the
 * second of Theology's four buttons, revamped in the house style;
 * docs/1.9-build/notes/theology-fable.md has the plan).
 *
 * The page's own bar, then the frame the four ways share
 * (components/theology/WayPage.tsx), and in it one card for each question,
 * in the order of the Creed: its subject's icon whole in its own light on a
 * plate (the hub's nine plates; lib/theology/subjects.ts says which subject
 * a question belongs to), the question's name, its short answer, and how
 * many of the Fathers it cites. The short answer is the first sentence of
 * the question's own definition, as the path gives it on the hub and on a
 * step (lib/theology/path.ts, firstSentence): nothing is written for this
 * page. A question no subject names yet follows the others by its name,
 * with no picture and no icon tile in its place. A card's picture
 * travels to the head of the question's own page (data-carry;
 * lib/ui/routeMotion.ts, components/theology/LeafPage.tsx).
 *
 * Until 1.9 the page printed each definition whole under hairlines, in the
 * order of the alphabet, with its German written into this file; the words
 * are the catalog's now, in every language.
 */
export default async function TopicsIndexPage() {
  const [topics, counts] = await Promise.all([loadAllTopics(), wayCounts()]);
  const subjectOf = (slug: string) => THEOLOGY_SUBJECTS.findIndex((s) => s.topics.includes(slug));
  const cards = topics
    .map((topic) => {
      const at = subjectOf(topic.slug);
      return {
        slug: topic.slug,
        title: topic.title,
        short: firstSentence(topic.definition),
        citations: topic.citations.length,
        // In the order of the Creed; a question no subject names comes after.
        order: at < 0 ? THEOLOGY_SUBJECTS.length : at,
        picture: at < 0 ? null : THEOLOGY_SUBJECTS[at].picture.src,
      };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  return (
    <>
      <MobileTopBar titleKey="discover.tile.topics" back backFallback="/theology" revealTitleOn={WAY_TITLE} searchPlace="theology" />
      <WayPage way="topics" counts={counts} lead="topics.h1" note={<p><T k="topics.intro" /></p>}>
        {cards.length === 0 ? (
          <p className="mt-7 font-sans text-detail leading-[1.6] text-paper/60">
            <T k="topics.emptyState" />
          </p>
        ) : (
          <ul data-topic-cards="" className="mt-7 space-y-3">
            {cards.map((card, at) => (
              <li key={card.slug}>
                <Link href={`/topics/${card.slug}`} data-topic-card={card.slug} className="theology-tray press-card flex min-h-11 items-start gap-3.5 rounded-[20px] p-3">
                  {card.picture ? (
                    <span aria-hidden data-row-picture="" data-carry={`topic:${card.slug}`} className="path-plate w-[78px] shrink-0">
                      <WholeIcon src={card.picture} eager={at < 4} className="aspect-[4/5] w-full rounded-[3px]" />
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1 py-0.5">
                    <h2 lang="en" dir="ltr" className="font-serif text-[17px] font-bold leading-tight text-paper rtl:text-right">
                      {card.title}
                    </h2>
                    <p lang="en" dir="ltr" className="mt-[5px] font-serif text-[14px] italic leading-[1.48] text-paper/80">
                      {card.short}
                    </p>
                    <p className="mt-2 flex items-center justify-between gap-3 font-sans text-caption text-paper/55">
                      <T k="topics.citations" count={card.citations} />
                      <ChevronRight size={14} className="shrink-0 rtl:-scale-x-100" />
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </WayPage>
    </>
  );
}
