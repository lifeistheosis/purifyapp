import { notFound } from "next/navigation";
import Link from "next/link";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { LessonEnd } from "@/components/prayers/LessonEnd";
import { SignOfTheCrossFigure } from "@/components/prayers/SignOfTheCrossFigure";
import { CROSS_FIGURE_LESSON } from "@/lib/prayers/signOfTheCross";
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
import { SourceList, marked, type ListedSource, type Mark } from "@/components/citations/Marked";
import { shownCite } from "@/lib/citations/shown";
import { cn } from "@/lib/cn";

type Params = Promise<{ lessonId: string }>;

type Block = { kind: "heading" | "list" | "text"; lines: string[] };

/**
 * A lesson's words as the file writes them: paragraphs apart by a blank line,
 * a paragraph that is all **bold** is a heading, and lines that open with
 * "- " are a list. The words are never changed, only set; until 1.7.1 the
 * marks themselves were printed ("**The hand**").
 */
function lessonBlocks(intro: string): Block[] {
  return intro
    .split(/\n\s*\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw): Block => {
      const heading = /^\*\*(.+)\*\*$/.exec(raw);
      if (heading) return { kind: "heading", lines: [heading[1]] };
      const lines = raw.split("\n");
      if (lines.every((l) => l.startsWith("- "))) return { kind: "list", lines: lines.map((l) => l.slice(2)) };
      return { kind: "text", lines: [raw] };
    });
}

/**
 * After each line of a lesson that says a Father taught something, a small
 * number that leads to where it comes from, at the lesson's foot (1.8,
 * components/citations/Marked.tsx).
 */
const SOURCE = "lesson-source-";

function LessonText({ blocks, lang, marks = [] }: { blocks: Block[]; lang: string; marks?: Mark[] }) {
  if (!blocks.length) return null;
  return (
    <div lang={lang} className="font-serif text-body leading-[1.85] text-paper/80">
      {blocks.map((b, i) => {
        // More room above a heading than below it.
        const gap = i === 0 ? "" : b.kind === "heading" ? "mt-12" : blocks[i - 1].kind === "heading" ? "mt-3" : "mt-[1.85em]";
        if (b.kind === "heading") {
          return (
            <h2 key={i} className={cn(gap, "text-lede font-bold leading-snug text-paper")}>
              {b.lines[0]}
            </h2>
          );
        }
        if (b.kind === "list") {
          return (
            <ul key={i} className={cn(gap, "list-disc space-y-2 ps-5 marker:text-paper/35")}>
              {b.lines.map((line, j) => (
                <li key={j}>{marked(line, marks, SOURCE)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className={cn(gap, "whitespace-pre-line")}>
            {marked(b.lines[0], marks, SOURCE)}
          </p>
        );
      })}
    </div>
  );
}

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
  const introBlocks = lessonBlocks(lesson.intro);
  const firstHeading = introBlocks.findIndex((b) => b.kind === "heading");
  const figureAt = firstHeading < 0 ? introBlocks.length : firstHeading;
  // The lines that credit a Father, numbered in the order they come, and
  // where each comes from (lib/prayers/learning.ts, LessonSource).
  const sources: ListedSource[] = (lesson.sources ?? []).map((s, i) => ({ words: s.words, n: i + 1, shown: shownCite(s.cite) }));
  const marks: Mark[] = sources.map(({ words, n }) => ({ words, n }));

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

          {/* The Sign of the Cross carries its drawing where its how begins,
              before "The hand" (components/prayers/SignOfTheCrossFigure.tsx). */}
          {lesson.id === CROSS_FIGURE_LESSON ? (
            <>
              <LessonText blocks={introBlocks.slice(0, figureAt)} lang={lang} marks={marks} />
              <SignOfTheCrossFigure />
              <LessonText blocks={introBlocks.slice(figureAt)} lang={lang} marks={marks} />
            </>
          ) : (
            <LessonText blocks={introBlocks} lang={lang} marks={marks} />
          )}

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

          {/* Where the lines that credit a Father come from (1.8): the line
              every quotation in the app has, or, for most of these, the plain
              word that they are not yet traced to a public-domain text. */}
          <SourceList id="lesson-sources" idPrefix={SOURCE} sources={sources} lang={lang} className="mt-12 border-t border-paper/10 pt-8" />

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
