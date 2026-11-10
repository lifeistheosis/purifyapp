import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { StudyShelves, type StudyShelf } from "@/components/theology/StudyShelves";
import { WayPage } from "@/components/theology/WayPage";
import { WAY_TITLE } from "@/components/theology/wayStyle";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { pathSteps } from "@/lib/theology/pathSteps";
import { wayCounts } from "@/lib/theology/wayCounts";

export const metadata = {
  title: "Doctrine",
  description:
    "Long-form patristic studies on the Trinity, Christology, the Theotokos, theosis, ecclesiology, and disputed Scripture, the doctrine traced through the Fathers and the Councils, every citation verbatim and sourced.",
};

export const revalidate = 3600;

/**
 * Doctrine, the treatises (1.9, build 89 note 2: the page behind the first
 * of Theology's four buttons, revamped in the house style;
 * docs/1.9-build/notes/theology-fable.md has the plan).
 *
 * The page's own bar, then the frame the four ways share
 * (components/theology/WayPage.tsx), and in it the studies as shelves by
 * subject, in the order of the Creed, each under its subject's icon
 * (components/theology/StudyShelves.tsx). The shelves are the path's own
 * studies (lib/theology/pathSteps.ts), so a study stands here under the
 * subject it stands under on the path, by its registry's own title, wearing
 * the same Father's face. lib/theology/__tests__/ways.test.ts holds every
 * study the library has to a subject, so none is left off this page.
 *
 * Until 1.9 the studies were grouped by seven doctrinal categories of this
 * page's own (THEOLOGY_GROUP_LABEL, lib/theology/topics.ts), a second map of
 * the faith beside the hub's nine subjects, drawn as text under hairlines.
 */
export default async function DoctrineIndexPage() {
  const [steps, counts] = await Promise.all([pathSteps(IS_STATIC_EXPORT), wayCounts()]);
  const shelves: StudyShelf[] = steps
    .map((step) => ({
      id: step.id,
      title: step.title,
      line: step.line,
      picture: step.picture.src,
      studies: step.reads.filter((read) => read.kind === "study"),
    }))
    .filter((shelf) => shelf.studies.length > 0);

  return (
    <>
      <MobileTopBar titleKey="study.doctrine" back backFallback="/theology" revealTitleOn={WAY_TITLE} searchPlace="theology" />
      <WayPage way="doctrine" counts={counts} lead="study.theology.doctrineLead" note={<p><T k="study.eachStudyLaysOutThe" /></p>}>
        <StudyShelves shelves={shelves} />
      </WayPage>
    </>
  );
}
