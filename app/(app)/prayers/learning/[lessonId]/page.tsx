import { notFound } from "next/navigation";
import Link from "next/link";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { LessonEnd } from "@/components/prayers/LessonEnd";
import { KeepDay } from "@/components/streak/KeepDay";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import {
  adjacentLessons,
  allLessonParams,
  getLesson,
  lessonsFor,
} from "@/lib/prayers/learning";
import { getServerLocale } from "@/lib/i18n/server";
import { T } from "@/components/i18n/T";

type Params = Promise<{ lessonId: string }>;

export function generateStaticParams() {
  return allLessonParams();
}

export async function generateMetadata({ params }: { params: Params }) {
  const { lessonId } = await params;
  // Metadata generation runs without a locale context: fall back to English
  // titles. The page itself reads the cookie and renders the right language.
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
export default async function LessonPage({ params }: { params: Params }) {
  const { lessonId } = await params;
  const locale = await getServerLocale();
  const lesson = getLesson(lessonId, locale);
  if (!lesson) notFound();
  const { prev, next } = adjacentLessons(lessonId, locale);
  const lang = locale === "de" ? "de" : "en";

  return (
    <>
      <MobileTopBar title={lesson.title} back backFallback="/prayers/learning" revealTitleOn="lesson-title" />
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

          <header className="mb-10">
            <p className="font-sans text-caption text-paper/55">
              <T
                k="prayers.lessonMeta"
                replacements={{ order: lesson.order, minutes: lesson.estimatedMinutes }}
              />
            </p>
            <h1
              id="lesson-title"
              lang={lang}
              className="mt-3 text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper md:text-heading"
            >
              {lesson.title}
            </h1>
          </header>

          <div lang={lang} className="whitespace-pre-line font-serif text-body leading-[1.85] text-paper/80">
            {lesson.intro}
          </div>

          {lesson.prayer ? (
            <section aria-labelledby="lesson-prayer" className="mt-12 border-y border-paper/10 py-8">
              <h2 id="lesson-prayer" className="font-sans text-caption text-paper/55" style={{ fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                <T k="footer.prayer" />
              </h2>
              <div lang={lang} className="mt-4 whitespace-pre-line font-serif text-lede leading-[1.75] text-paper">
                {lesson.prayer}
              </div>
            </section>
          ) : null}

          {lesson.tryThis ? (
            <section aria-labelledby="lesson-try" className="mt-12">
              <h2 id="lesson-try" className="font-sans text-caption text-paper/55" style={{ fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                <T k="prayers.tryThis" />
              </h2>
              <p lang={lang} className="mt-3 font-serif text-body italic leading-[1.7] text-paper/75">
                {lesson.tryThis}
              </p>
            </section>
          ) : null}

          <LessonEnd
            id={lesson.id}
            lessonIds={lessonsFor(locale).map((l) => l.id)}
            prev={prev ? { id: prev.id, title: prev.title } : null}
            next={next ? { id: next.id, title: next.title } : null}
          />
        </div>
      </section>
    </>
  );
}
