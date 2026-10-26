"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { WorkContents, numbersOf, type ContentsSection } from "@/components/saints/MobileWorkPill";

/** How many chapters show before the rest go behind "All N chapters". */
const SHOWN = 6;

/**
 * A work's chapters at the top of its text, on every screen (1.7, the
 * reading room's book page). Until 1.7 a phone reached them only through the
 * section pill's sheet, and a computer through a box that only it drew.
 *
 * A work read straight through shows its first six, then "All N chapters",
 * which opens the same contents sheet the pill does. A long work is already
 * a list of its chapters (WritingReader's accordion, every title in the
 * page), so it gets the button alone, to jump without scrolling the list.
 * A chapter opens by its address (#sN), which the reader follows.
 */
export function ChaptersList({ sections, accordion }: { sections: ContentsSection[]; accordion: boolean }) {
  const { t, tn } = useTranslate();
  const [open, setOpen] = useState(false);
  if (sections.length < 2) return null;
  const numbers = numbersOf(sections);
  const jump = (n: number) => {
    window.location.hash = `#s${n}`;
  };
  const all = (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => setOpen(true)}
      className="tap-press hit-44 mt-3 inline-flex h-10 items-center rounded-pill border border-paper/15 px-4 font-sans text-detail font-semibold text-paper/80 hover:border-paper/35 hover:text-paper"
    >
      {tn("reading.work.allChapters", sections.length)}
    </button>
  );
  return (
    <nav aria-labelledby="work-chapters" data-work-chapters="" className="pt-8">
      <p id="work-chapters" className="font-sans text-ui font-semibold text-paper">
        {t("reading.work.chapters")}
      </p>
      {accordion ? null : (
        <ol className="mt-2 divide-y divide-paper/8">
          {sections.slice(0, SHOWN).map((s, i) => (
            <li key={s.n}>
              <a href={`#s${s.n}`} className="flex items-baseline gap-3 py-2.5 font-sans text-ui text-paper/80 hover:text-paper">
                {numbers ? (
                  <span
                    className="shrink-0 text-right font-semibold tabular-nums text-paper/40"
                    style={{ minWidth: `${Math.max(2, ...numbers.map((x) => x.length))}ch` }}
                  >
                    {numbers[i]}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{s.title}</span>
              </a>
            </li>
          ))}
        </ol>
      )}
      {accordion || sections.length > SHOWN ? all : null}
      <WorkContents open={open} onClose={() => setOpen(false)} sections={sections} onJump={jump} desktop />
    </nav>
  );
}
