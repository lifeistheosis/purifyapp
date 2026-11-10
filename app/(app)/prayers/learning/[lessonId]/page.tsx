import { notFound } from "next/navigation";
import Link from "next/link";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { LessonView } from "@/components/prayers/LessonView";
import { KeepDay } from "@/components/streak/KeepDay";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { allLessonParams, getLesson, lessonsFor } from "@/lib/prayers/learning";
import { lessonPlace } from "@/lib/prayers/lessonText";
import { T } from "@/components/i18n/T";
import { shownCite } from "@/lib/citations/shown";

type Params = Promise<{ lessonId: string }>;

export function generateStaticParams() {
  return allLessonParams();
}

export async function generateMetadata({ params }: { params: Params }) {
  const { lessonId } = await params;
  // Metadata generation runs without a locale context: the English title.
  // The page writes the English, and the device loads the reader's language
  // from its own file (components/prayers/LessonView.tsx).
  const l = getLesson(lessonId);
  if (!l) return { title: "Learn to pray" };
  return {
    title: l.title,
    description: l.summary,
  };
}

// A lesson of Learn to pray (1.7): its words, the prayer it teaches set apart
// between hairlines, what to try, and at its foot the mark that it was read
// and the way on (components/prayers/LessonEnd.tsx). Its own bar takes the
// lesson's name once the heading has scrolled away; back leads to the lessons.
//
// In the reader's language (1.9, the arbiter's yes to the German lessons in
// the apps): the page writes the English, and components/prayers/LessonView.tsx
// sets a German reader's lesson from the German file, loaded on the device.
// Until 1.9 the page chose on the server, which in the apps is English for
// every reader (lib/i18n/server.ts). Only the lesson's name in German rides
// with the page, for its bar.
export default async function LessonPage({ params }: { params: Params }) {
  const { lessonId } = await params;
  const english = lessonPlace(lessonsFor("en"), lessonId);
  if (!english) notFound();
  const german = getLesson(lessonId, "de");
  // Where each line that credits a Father comes from: the same place in every language.
  const shown = (english.lesson.sources ?? []).map((s) => shownCite(s.cite));

  return (
    <>
      <MobileTopBar
        title={english.lesson.title}
        titles={german && german.title !== english.lesson.title ? { de: german.title } : undefined}
        back
        backFallback="/prayers/learning"
        revealTitleOn="lesson-title"
      />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14" aria-labelledby="lesson-title">
        {/* Reading a lesson keeps the day for the streak, and the teaching strand on Today. */}
        <KeepDay strand="day:teaching" />
        <div className="mx-auto w-full max-w-[620px]">
          {/* A computer has no phone bar: the way back to the lessons. */}
          <Link
            href="/prayers/learning"
            className="mb-8 hidden min-h-11 items-center gap-1 font-sans text-caption text-paper/55 transition-colors hover:text-paper md:inline-flex native-md-hidden"
          >
            <ChevronLeft size={14} className="shrink-0 rtl:-scale-x-100" />
            <T k="ui.learnToPray" />
          </Link>

          <LessonView english={english} shown={shown} />
        </div>
      </section>
    </>
  );
}
