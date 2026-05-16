import { notFound } from "next/navigation";
import Link from "next/link";
import {
  adjacentLessons,
  allLessonParams,
  getLesson,
} from "@/lib/prayers/learning";

type Params = Promise<{ lessonId: string }>;

export function generateStaticParams() {
  return allLessonParams();
}

export async function generateMetadata({ params }: { params: Params }) {
  const { lessonId } = await params;
  const l = getLesson(lessonId);
  if (!l) return { title: "Learn to pray - Purify" };
  return {
    title: `${l.title} - Purify`,
    description: l.summary,
  };
}

export default async function LessonPage({ params }: { params: Params }) {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();
  const { prev, next } = adjacentLessons(lessonId);

  return (
    <section className="bg-night px-5 md:px-8 py-12 md:py-20">
      <div className="mx-auto max-w-[720px] w-full">
        <Link
          href="/prayers/learning"
          className="inline-flex items-center font-sans text-[12px] uppercase tracking-[1.5px] text-paper/50 hover:text-paper transition-colors"
        >
          ← Learn to pray
        </Link>

        <header className="mt-6 mb-10">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/50">
            Lesson {lesson.order} · {lesson.estimatedMinutes} min
          </p>
          <h1 className="mt-2 font-sans text-[36px] md:text-[48px] font-bold leading-[1.05] tracking-[-0.02em] text-paper">
            {lesson.title}
          </h1>
        </header>

        <hr className="mb-10 border-0 h-px bg-white/10" />

        <div className="font-serif text-[17px] leading-[1.7] text-paper/85 whitespace-pre-line">
          {lesson.intro}
        </div>

        {lesson.prayer && (
          <div className="mt-10 rounded-lg border border-paper/12 bg-paper/[0.04] p-6 md:p-8">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/50 mb-4">
              The prayer
            </p>
            <div className="font-serif text-[18px] md:text-[19px] leading-[1.75] text-paper/95 whitespace-pre-line">
              {lesson.prayer}
            </div>
          </div>
        )}

        {lesson.tryThis && (
          <div className="mt-10 rounded-lg border border-accent/30 bg-accent/[0.06] p-6">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-accent/80 mb-3">
              Try this
            </p>
            <p className="font-serif text-[16px] leading-[1.65] text-paper/85">
              {lesson.tryThis}
            </p>
          </div>
        )}

        <nav className="mt-16 pt-8 border-t border-white/8 flex items-center justify-between gap-4">
          {prev ? (
            <Link
              href={`/prayers/learning/${prev.id}`}
              className="font-sans text-[14px] text-paper/70 hover:text-paper transition-colors"
            >
              <span className="block text-[11px] uppercase tracking-[1.5px] text-paper/40">
                Previous lesson
              </span>
              <span className="block mt-1">← {prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/prayers/learning/${next.id}`}
              className="font-sans text-[14px] text-paper/70 hover:text-paper transition-colors text-right"
            >
              <span className="block text-[11px] uppercase tracking-[1.5px] text-paper/40">
                Next lesson
              </span>
              <span className="block mt-1">{next.title} →</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </section>
  );
}
