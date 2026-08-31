import { notFound } from "next/navigation";
import Link from "next/link";
import {
  adjacentLessons,
  allLessonParams,
  getLesson,
} from "@/lib/prayers/learning";
import { getServerLocale } from "@/lib/i18n/server";
import { T } from "@/components/i18n/T";

type Params = Promise<{ lessonId: string }>;

export function generateStaticParams() {
  return allLessonParams();
}

export async function generateMetadata({ params }: { params: Params }) {
  const { lessonId } = await params;
  // Metadata generation runs without a locale context — fall back to English
  // titles. The page itself reads the cookie and renders the right language.
  const l = getLesson(lessonId);
  if (!l) return { title: "Learn to pray" };
  return {
    title: l.title,
    description: l.summary,
  };
}

export default async function LessonPage({ params }: { params: Params }) {
  const { lessonId } = await params;
  const locale = await getServerLocale();
  const lesson = getLesson(lessonId, locale);
  if (!lesson) notFound();
  const { prev, next } = adjacentLessons(lessonId, locale);

  return (
    <section className="bg-night min-h-screen px-6 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[620px] w-full">
        <Link
          href="/prayers/learning"
          className="inline-flex items-center font-sans text-eyebrow uppercase tracking-[2px] text-paper/40 hover:text-paper transition-colors"
        >
          ← <T k="ui.learnToPray" />
        </Link>

        <header className="mt-8 mb-12 md:mb-14">
          <p className="font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40 mb-5">
            <T
              k="prayers.lessonMeta"
              replacements={{
                order: lesson.order,
                minutes: lesson.estimatedMinutes,
              }}
            />
          </p>
          <h1 className="font-serif text-title md:text-heading leading-[1.15] tracking-[-0.01em] text-paper">
            {lesson.title}
          </h1>
          <div aria-hidden className="mt-7 h-px w-10 bg-gold/50" />
        </header>

        <div className="font-serif text-body leading-[1.85] text-paper/75 whitespace-pre-line">
          {lesson.intro}
        </div>

        {lesson.prayer && (
          <div className="mt-12 border-l border-gold/30 pl-6">
            <p className="font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40 mb-4">
              <T k="footer.prayer" />
            </p>
            <div className="font-serif text-lede leading-[1.8] text-paper/90 whitespace-pre-line">
              {lesson.prayer}
            </div>
          </div>
        )}

        {lesson.tryThis && (
          <div className="mt-12">
            <p className="font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40 mb-3">
              <T k="prayers.tryThis" />
            </p>
            <p className="font-serif italic text-body leading-[1.7] text-paper/70">
              {lesson.tryThis}
            </p>
          </div>
        )}

        <nav className="mt-16 pt-8 border-t border-paper/10 flex items-center justify-between gap-4">
          {prev ? (
            <Link
              href={`/prayers/learning/${prev.id}`}
              className="font-sans text-ui text-paper/70 hover:text-paper transition-colors"
            >
              <span className="block text-eyebrow uppercase tracking-[1.5px] text-paper/40">
                <T k="prayers.previousLesson" />
              </span>
              <span className="block mt-1">← {prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/prayers/learning/${next.id}`}
              className="font-sans text-ui text-paper/70 hover:text-paper transition-colors text-right"
            >
              <span className="block text-eyebrow uppercase tracking-[1.5px] text-paper/40">
                <T k="prayers.nextLesson" />
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
