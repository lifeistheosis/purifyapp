"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { FONT_CLASSES, SIZE_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { CouncilBookHeader } from "@/components/councils/CouncilBookHeader";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { KeepReading } from "@/components/saints/KeepReading";
import { MobileWorkPill } from "@/components/saints/MobileWorkPill";
import { WorkContents } from "@/components/saints/WorkContents";
import { WorkHead } from "@/components/saints/WorkHead";
import { usePartWords } from "@/components/saints/partWords";
import { chapterOf, useChapterTarget, useGoToChapter, useKeepPlace, useLanding } from "@/components/saints/useWorkPlace";
import { Sheet } from "@/components/ui/Sheet";
import { neighbours, partsOf } from "@/lib/saints/parts";
import { WORK_ABOUT_EVENT, WORK_CONTENTS_EVENT, setWorkNow } from "@/lib/saints/workNow";
import { useScrollAway } from "@/lib/ui/scrollAway";

/**
 * A council's document in the reader of the Fathers' works (1.8, the owner's
 * build 80 note 12 and his pick of r3-03: "every book opened in the room's
 * reader"; and since round 6 his pick A of r3-29, "As the Bible reads"):
 * one section at a time as its own page, its title large where the Bible's
 * book stands and the document's under it, with the chevron to the
 * contents; the Bible's pill on its fade, stepping away while the reader
 * reads on; the contents as the Bible's books sheet; the next section
 * waiting under the last line; About this book (the document's own page)
 * from the contents and from •••; and the reader's place kept to the
 * paragraph, with no expiry (lib/reader/position.ts, under "councils/<its
 * council>"), a return landing on it.
 *
 * The page writes the text, each section at its own address (#s3), which the
 * quotations elsewhere in the app open, and its paragraphs as places
 * (data-place); this shows the one being read and hides the rest, by a rule
 * of its own written with the page, so the first frame is already the right
 * one. The titles are the document's own, in its English.
 */
export function CouncilReader({
  positionKey,
  docSlug,
  title,
  sections,
  about,
  children,
}: {
  /** Where its place is kept: "councils/<council>", beside the Fathers' "<saint>". */
  positionKey: string;
  docSlug: string;
  /** The document's title. */
  title: string;
  sections: { n: number; title: string }[];
  /** The document's own page, for About this book. */
  about: React.ComponentProps<typeof CouncilBookHeader>;
  /** The text, written by the page: its sections, each with id `s<n>` and data-council-part. */
  children: ReactNode;
}) {
  const { t } = useTranslate();
  const { size, font } = useReaderPrefs();
  const { pill } = usePartWords();
  useScrollAway();

  const { heads, contents } = useMemo(() => partsOf(sections, null, title), [sections, title]);
  const target = useChapterTarget(positionKey, docSlug);
  const at = useMemo(() => chapterOf(target, sections), [target, sections]);
  const head = heads.find((h) => h.n === at.n) ?? heads[0];
  const { prev, next } = neighbours(heads, head.n);
  const go = useGoToChapter();
  useLanding(positionKey, docSlug, target, at);
  useKeepPlace(positionKey, docSlug, sections, null);

  // The words of the section on the screen, for the minutes left.
  const [words, setWords] = useState<number[]>([]);
  useEffect(() => {
    const rows = document.querySelectorAll<HTMLElement>(`[data-council-part="${head.n}"] [data-place]`);
    const out: number[] = [];
    rows.forEach((row) => {
      const i = Number(row.getAttribute("data-place")?.split(":")[1]);
      if (Number.isInteger(i)) out[i] = (row.textContent ?? "").split(/\s+/).filter(Boolean).length;
    });
    // Read from the page once the section shows: the text is the page's.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWords(Array.from(out, (w) => w ?? 0));
  }, [head.n]);

  useEffect(() => {
    // No bookmark here: a council's document is not a saint's work (lib/bookmarks.ts).
    setWorkNow({ saintSlug: "", saintName: "", workSlug: docSlug, workTitle: title, sectionN: head.n, sectionTitle: head.n ? sections.find((s) => s.n === head.n)?.title ?? "" : "", label: pill(head) });
  }, [docSlug, title, head, sections, pill]);
  useEffect(() => () => setWorkNow(null), []);

  const [sheet, setSheet] = useState<"contents" | "about" | null>(null);
  useEffect(() => {
    const contentsOpen = () => setSheet("contents");
    const aboutOpen = () => setSheet("about");
    window.addEventListener(WORK_CONTENTS_EVENT, contentsOpen);
    window.addEventListener(WORK_ABOUT_EVENT, aboutOpen);
    return () => {
      window.removeEventListener(WORK_CONTENTS_EVENT, contentsOpen);
      window.removeEventListener(WORK_ABOUT_EVENT, aboutOpen);
    };
  }, []);
  const [sheetFor, setSheetFor] = useState(target);
  if (sheetFor !== target) {
    setSheetFor(target);
    if (sheet) setSheet(null);
  }

  return (
    <article data-council-reader="" data-work-reader="" className={`pb-24 safe-pb-reader ${FONT_CLASSES[font]} ${SIZE_CLASSES[size]}`}>
      {/* The section being read, and only it: a rule written with the page. */}
      <style>{`[data-council-reader] [data-council-part]:not([data-council-part="${head.n}"]) { display: none; }`}</style>
      <div key={head.n} className="mx-auto w-full max-w-[680px]">
        <WorkHead head={head} />
      </div>
      {/* Keyed by the section, so a section opens as the Bible's chapter does. */}
      <div key={`words-${head.n}`} className="page-open-after">
        {children}
      </div>
      <div className="mx-auto w-full max-w-[680px]">
        <KeepReading next={next} onGo={go} />
      </div>
      <MobileWorkPill head={head} prev={prev} next={next} onGo={go} words={words} />
      <WorkContents
        open={sheet === "contents"}
        onClose={() => setSheet(null)}
        title={title}
        entries={contents}
        heads={heads}
        current={head.n}
        onGo={go}
        onAbout={() => setSheet("about")}
      />
      <Sheet open={sheet === "about"} onClose={() => setSheet(null)} title={t("bible.aboutThisBook")} openFull desktop>
        <div data-about-sheet="">
          <CouncilBookHeader {...about} heading="h2" />
        </div>
      </Sheet>
    </article>
  );
}
