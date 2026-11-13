import Link from "next/link";

import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { WayPage } from "@/components/theology/WayPage";
import { WAY_FACT, WAY_H2, WAY_TITLE } from "@/components/theology/wayStyle";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { APOLOGETICS_GROUP_LABEL, APOLOGETICS_GROUP_ORDER, apologeticsByGroup } from "@/lib/apologetics/topics";
import { wayCounts } from "@/lib/theology/wayCounts";

export const metadata = {
  title: "Apologetics",
  description:
    "A reasoned Orthodox defense of the faith: the existence of God against atheism and deism, and the place of Scripture, Tradition, and the Church against sola scriptura.",
};

export const revalidate = 3600;

/**
 * Apologetics, the answers (1.9, build 89 note 2: the page behind the fourth
 * of Theology's four buttons, revamped in the house style;
 * docs/1.9-build/notes/theology-fable.md has the plan).
 *
 * The page's own bar, then the frame the four ways share
 * (components/theology/WayPage.tsx), and in it the objections by kind, each
 * kind named with its own line (lib/apologetics/topics.ts), each answer a
 * raised card: the answer's name and its length, its line, and its summary
 * whole, since there are few and a reader chooses by what an answer says.
 * Nothing is cut short with dots (his build 86 note 76, of Discover's
 * lines). What is planned and not yet written is not listed, as it is not
 * counted. No icon tile on a card (1.9, the fifteen screens, rule 4).
 *
 * Until 1.9 each answer was text under a hairline, its summary cut at three
 * lines.
 */
export default async function ApologeticsIndexPage() {
  const counts = await wayCounts();
  const kinds = APOLOGETICS_GROUP_ORDER.map((group) => ({
    group,
    label: APOLOGETICS_GROUP_LABEL[group],
    answers: apologeticsByGroup(group).filter((answer) => !answer.planned),
  })).filter((kind) => kind.answers.length > 0);

  return (
    <>
      <MobileTopBar titleKey="discover.tile.apologetics" back backFallback="/theology" revealTitleOn={WAY_TITLE} searchPlace="theology" />
      <WayPage way="apologetics" counts={counts} lead="study.apologetics.lead" note={<p><T k="study.whereDoctrineAndTopicsArgue" /></p>}>
        {kinds.map(({ group, label, answers }, at) => (
          <section key={group} data-objection={group} aria-labelledby={`objection-${group}`} className={at === 0 ? "mt-7" : "mt-8"}>
            <h2 id={`objection-${group}`} lang="en" dir="ltr" className={`${WAY_H2} rtl:text-right`}>
              {label.en}
            </h2>
            <p lang="en" dir="ltr" className="mt-1 font-sans text-caption leading-[1.42] text-paper/55 rtl:text-right">
              {label.subtitle}
            </p>
            <ul className="mt-3 space-y-3">
              {answers.map((answer) => (
                <li key={answer.slug}>
                  <Link href={`/apologetics/${answer.slug}`} data-answer-card={answer.slug} className="theology-tray press-card block min-h-11 rounded-[20px] p-3.5">
                    <div className="flex items-center gap-3">
                      <h3 lang="en" dir="ltr" className="min-w-0 flex-1 font-serif text-[17px] font-semibold leading-[1.3] text-paper rtl:text-right">
                        {answer.title}
                      </h3>
                      {answer.estimatedMinutes ? (
                        <span className={WAY_FACT}>
                          <T k="bible.minRead" replacements={{ minutes: answer.estimatedMinutes }} />
                        </span>
                      ) : null}
                      <ChevronRight size={16} className="shrink-0 text-paper/55 rtl:-scale-x-100" />
                    </div>
                    {answer.subtitle ? (
                      <p lang="en" dir="ltr" className="mt-3 font-serif text-[14.5px] italic leading-[1.45] text-paper/80">
                        {answer.subtitle}
                      </p>
                    ) : null}
                    <p lang="en" dir="ltr" className="mt-2 font-sans text-detail leading-[1.55] text-paper/65">
                      {answer.summary}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </WayPage>
    </>
  );
}
