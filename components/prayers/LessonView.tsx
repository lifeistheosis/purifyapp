"use client";

import { useMemo } from "react";

import { SourceList, marked, type ListedSource, type Mark } from "@/components/citations/Marked";
import { T } from "@/components/i18n/T";
import { useInReadersLanguage, type Loaders } from "@/components/i18n/useInReadersLanguage";
import type { ShownCite } from "@/lib/citations/cite";
import { cn } from "@/lib/cn";
import type { PrayerLesson } from "@/lib/prayers/learning";
import { lessonBlocks, lessonPlace, type Block, type LessonPlace } from "@/lib/prayers/lessonText";
import { CROSS_FIGURE_LESSON } from "@/lib/prayers/signOfTheCross";

import { LessonEnd } from "./LessonEnd";
import { SignOfTheCrossFigure } from "./SignOfTheCrossFigure";
import { textDir } from "@/lib/i18n/textDir";

/**
 * Every language Learn to pray is written in besides English, each its own
 * file, loaded on the device when the reader's language is one of them (1.9,
 * components/i18n/useInReadersLanguage.ts). A type alone is taken from
 * lib/prayers/learning.ts, which holds both files: no language rides in the
 * code of a reader who does not read it. lib/i18n/__tests__/serverLocale.test.ts
 * holds every lessons.<lang>.json to a row here.
 */
export const LESSON_FILES: Loaders<PrayerLesson[]> = {
  de: () => import("@/data/prayers/learning/lessons.de.json").then((m) => m.default as unknown as PrayerLesson[]),
};

/**
 * After each line of a lesson that says a Father taught something, a small
 * number that leads to where it comes from, at the lesson's foot (1.8,
 * components/citations/Marked.tsx).
 */
const SOURCE = "lesson-source-";

function LessonText({ blocks, lang, marks = [] }: { blocks: Block[]; lang: string; marks?: Mark[] }) {
  if (!blocks.length) return null;
  return (
    <div lang={lang} dir={textDir(lang)} className="font-serif text-body leading-[1.85] text-paper/80">
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

/**
 * A lesson of Learn to pray in the reader's language (1.9): the page writes
 * the English, and a German reader's lesson is the German file's, with its
 * own way on. Where each line that credits a Father comes from is the same
 * place in every language (the test holds the files to the same places), so
 * the page reads it once, on the server (`shown`), and the words are the
 * reader's.
 */
export function LessonView({ english, shown }: { english: LessonPlace<PrayerLesson>; shown: (ShownCite | null)[] }) {
  const id = english.lesson.id;
  // This lesson's place in each other language's list, from that language's file.
  const loaders = useMemo<Loaders<LessonPlace<PrayerLesson>>>(
    () => ({ de: async () => lessonPlace(await LESSON_FILES.de!(), id) ?? english }),
    [id, english],
  );
  const { value: place, lang } = useInReadersLanguage(english, loaders, id);
  const { lesson, prev, next, ids } = place;
  const introBlocks = lessonBlocks(lesson.intro);
  const firstHeading = introBlocks.findIndex((b) => b.kind === "heading");
  const figureAt = firstHeading < 0 ? introBlocks.length : firstHeading;
  const sources: ListedSource[] = (lesson.sources ?? []).map((s, i) => ({ words: s.words, n: i + 1, shown: shown[i] ?? null }));
  const marks: Mark[] = sources.map(({ words, n }) => ({ words, n }));

  return (
    <>
      <header className="mb-10">
        <p className="font-sans text-caption text-paper/55">
          <T k="prayers.lessonMeta" replacements={{ order: lesson.order, minutes: lesson.estimatedMinutes }} />
        </p>
        <h1 id="lesson-title" lang={lang} dir={textDir(lang)} className="mt-3 text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper md:text-heading">
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
          <div lang={lang} dir={textDir(lang)} className="mt-4 whitespace-pre-line font-serif text-lede leading-[1.75] text-paper">
            {lesson.prayer}
          </div>
        </section>
      ) : null}

      {lesson.tryThis ? (
        <section aria-labelledby="lesson-try" className="mt-12">
          <h2 id="lesson-try" className="font-sans text-caption text-paper/55" style={{ fontFamily: "var(--font-sans)", fontWeight: 600 }}>
            <T k="prayers.tryThis" />
          </h2>
          <p lang={lang} dir={textDir(lang)} className="mt-3 font-serif text-body italic leading-[1.7] text-paper/75">
            {lesson.tryThis}
          </p>
        </section>
      ) : null}

      {/* Where the lines that credit a Father come from (1.8): the line
          every quotation in the app has, or, for most of these, the plain
          word that they are not yet traced to a public-domain text. */}
      <SourceList id="lesson-sources" idPrefix={SOURCE} sources={sources} lang={lang} className="mt-12 border-t border-paper/10 pt-8" />

      <LessonEnd id={lesson.id} lessonIds={ids} prev={prev} next={next} />
    </>
  );
}
