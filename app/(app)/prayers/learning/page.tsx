import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { ArtPlate } from "@/components/prayers/ArtPlate";
import { LessonList, LessonWayIn } from "@/components/prayers/LessonList";
import { getServerLocale } from "@/lib/i18n/server";
import { lessonsFor } from "@/lib/prayers/learning";

export const metadata = {
  title: "Learn to pray",
  description:
    "An Orthodox beginner's path to prayer: the Sign of the Cross, the Jesus Prayer, the Trisagion, and a simple morning and evening rule.",
};

// Learn to pray (1.7, the owner's note 16): the lessons in order, the next
// one to read named in the way in, and each lesson read marked with a check.
// The marks live on the device (lib/prayers/lessonProgress.ts), so the list
// and the way in are client children; everything else is written here. The
// lessons are English and German (data/prayers/learning); the apps' static
// export carries the English.
export default async function LearnToPrayPage() {
  const locale = await getServerLocale();
  const lessons = lessonsFor(locale);
  const lang = locale === "de" ? "de" : "en";
  const minutes = lessons.reduce((sum, l) => sum + l.estimatedMinutes, 0);
  const rows = lessons.map(({ id, order, title, summary, estimatedMinutes }) => ({
    id,
    order,
    title,
    summary,
    estimatedMinutes,
  }));

  return (
    <>
      <MobileTopBar titleKey="ui.learnToPray" back backFallback="/prayers" revealTitleOn="learn-title" />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14" aria-labelledby="learn-title">
        <div className="mx-auto w-full max-w-[640px]">
          <header className="flex flex-col items-center text-center">
            <ArtPlate id="learning" size="md" className="shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]" />
            <h1 id="learn-title" className="mt-6 text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper md:text-heading">
              <T k="ui.learnToPray" />
            </h1>
            <p className="mt-2 font-sans text-caption text-paper/50">
              <T k="prayers.lessonCount" count={lessons.length} />
              {" · "}
              <T k="prayers.reader.aboutMin" replacements={{ min: minutes }} />
            </p>
            <div className="mt-6 flex max-w-full justify-center">
              <LessonWayIn lessons={rows} />
            </div>
          </header>

          <p className="mt-9 max-w-[60ch] font-sans text-ui leading-[1.65] text-paper/70">
            <T k="prayers.learningIntro" />
          </p>

          <div className="mt-6">
            <LessonList lessons={rows} lang={lang} />
          </div>

          <p className="mt-10 font-sans text-caption leading-[1.7] text-paper/50">
            <T k="prayers.learningMoreComing" />
          </p>
        </div>
      </section>
    </>
  );
}
