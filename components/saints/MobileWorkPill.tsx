"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { AmbienceButton } from "@/components/player/AmbienceButton";
import { cn } from "@/lib/cn";
import { contentsNumbers } from "@/lib/reading/contentsNumbers";
import { useOverlayOpen } from "@/lib/ui/overlay";

/** A section as the pill and the contents list it: `label` is its number as the edition prints it. */
export type ContentsSection = { n: number; title: string; label?: string };

/** The numbers beside the titles, or null where every title says its own. */
export function numbersOf(sections: readonly ContentsSection[]): string[] | null {
  return contentsNumbers(sections.map((s) => ({ title: s.title, label: s.label ?? String(s.n) })));
}

/**
 * Mobile-only floating pill for the saint-works reader, modeled on
 * `MobileChapterPill` in the Bible reader. Shows `‹ Section N of M ›`
 * where N is the section currently scrolled into view (detected via
 * IntersectionObserver on the `s${n}` anchors `WritingReader` already
 * stamps on each section).
 *
 * Tapping the label opens a bottom sheet with the full TOC, so a reader
 * can jump anywhere in a long work without scrolling back to the
 * `<details>` block at the top.
 *
 * Hidden on `md+`, desktop has the in-page TOC. Reader chrome: focus mode
 * puts it away (1.7), where the way out of focus stands at the foot.
 *
 * It ends in the sound button, as the chapter pill does (1.7, the owner's
 * note 25): ambience under a work of the Fathers too.
 *
 * Like the chapter pill it steps aside while anything rises over the text
 * (lib/ui/overlay.ts): a hold's Copy pill and a paragraph's tools stand in
 * its very place (1.7.1, the owner's screenshot: "pill buttons colliding
 * here", Copy over "Section").
 */
export function MobileWorkPill({
  sections,
}: {
  sections: ContentsSection[];
}) {
  const { t } = useTranslate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const covered = useOverlayOpen();

  useEffect(() => {
    if (sections.length === 0) return;
    const ids = sections.map((s) => `s${s.n}`);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    // Track which sections are intersecting; pick the topmost one in view.
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        // Pick the lowest-index section that is currently visible. If
        // none, keep the previous current (reader is between sections).
        for (let i = 0; i < ids.length; i++) {
          if (visible.has(ids[i])) {
            setCurrentIdx(i);
            return;
          }
        }
      },
      {
        // Trigger when the section header crosses the top quarter of the
        // viewport, feels like "I'm reading this one."
        rootMargin: "-15% 0px -70% 0px",
        threshold: 0,
      },
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;
  const total = sections.length;
  const current = sections[currentIdx];
  const prev = currentIdx > 0 ? sections[currentIdx - 1] : null;
  const next = currentIdx < total - 1 ? sections[currentIdx + 1] : null;

  function jumpTo(n: number) {
    window.location.hash = `#s${n}`;
    // The hashchange listener in WritingReader expands the section and
    // scrolls it; nothing else to do here.
  }

  return (
    <>
      <div
        aria-label={t("saints.sectionSwitcher")}
        data-reader-chrome
        data-reader-pill
        // Out of reach and out of hearing while something stands over it.
        aria-hidden={covered || undefined}
        className={cn(
          "md:hidden native-md-flex fixed inset-x-0 z-40 flex justify-center pointer-events-none motion-safe:transition-opacity motion-safe:duration-200",
          covered && "opacity-0",
        )}
        style={{
          bottom:
            "calc(var(--tab-bar-h) + var(--now-playing-h) + env(safe-area-inset-bottom, 0px) + 12px)",
        }}
      >
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-pill bg-night/95 backdrop-blur border border-white/15 shadow-raise pl-1 pr-1 py-1 max-w-[92vw]",
            covered ? "pointer-events-none" : "pointer-events-auto",
          )}
        >
          <button
            type="button"
            aria-label={prev ? `Previous: ${prev.title}` : "No previous section"}
            disabled={!prev}
            onClick={() => prev && jumpTo(prev.n)}
            className={
              "h-10 w-10 inline-flex items-center justify-center font-sans text-lede leading-none " +
              (prev ? "text-paper/85 hover:text-paper" : "text-paper/25")
            }
          >
            {/* Drawn chevrons, not the ‹ › characters, which sit in the
                fonts' symbol files: showing one made the phone fetch a
                font and lay a long work out again as it opened. */}
            <ChevronLeft size={20} className="rtl:-scale-x-100" />
          </button>
          <button
            type="button"
            onClick={() => setTocOpen(true)}
            className="px-3 h-10 inline-flex items-center font-sans text-detail font-semibold text-paper truncate max-w-[60vw]"
          >
            {/* Counted by place, not by the file's numbers: the Confessions'
                Book II is its section 102 (contentsNumbers). */}
            {t("saints.sectionOf", { n: currentIdx + 1, total })}
          </button>
          <button
            type="button"
            aria-label={next ? `Next: ${next.title}` : "No next section"}
            disabled={!next}
            onClick={() => next && jumpTo(next.n)}
            className={
              "h-10 w-10 inline-flex items-center justify-center font-sans text-lede leading-none " +
              (next ? "text-paper/85 hover:text-paper" : "text-paper/25")
            }
          >
            <ChevronLeft size={20} className="-scale-x-100 rtl:scale-x-100" />
          </button>
          <span aria-hidden className="mx-0.5 h-5 w-px bg-white/15" />
          <AmbienceButton variant="pill" />
        </div>
      </div>

      <WorkContents
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        sections={sections}
        current={current.n}
        onJump={jumpTo}
      />
    </>
  );
}

/**
 * A work's contents in the shared movable sheet: every section, its number
 * as the edition prints it (none where the titles already say it) and its
 * title, the one being read marked. Opened from the section pill and from
 * the chapters at the top of a work (components/reading/ChaptersList.tsx).
 */
export function WorkContents({
  open,
  onClose,
  sections,
  current,
  onJump,
  desktop = false,
}: {
  open: boolean;
  onClose: () => void;
  sections: ContentsSection[];
  /** The section being read, by its number. */
  current?: number;
  onJump: (n: number) => void;
  /** Also on a computer: the chapters list opens it at every width. */
  desktop?: boolean;
}) {
  const { t } = useTranslate();
  const numbers = numbersOf(sections);
  const width = numbers ? `${Math.max(2, ...numbers.map((x) => x.length))}ch` : undefined;
  return (
    <Sheet open={open} onClose={onClose} title={t("saints.contents")} desktop={desktop}>
      <ol className="grid grid-cols-1 gap-y-1 font-sans text-ui">
        {sections.map((s, i) => {
          const active = s.n === current;
          return (
            <li key={s.n}>
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => {
                  onClose();
                  onJump(s.n);
                }}
                className={
                  "w-full text-left flex items-baseline gap-3 py-2.5 px-2 rounded-md " +
                  (active ? "font-semibold text-paper" : "text-paper/75 hover:bg-paper/[0.04]")
                }
              >
                {numbers ? (
                  <span
                    className={"tabular-nums shrink-0 text-right font-semibold " + (active ? "text-paper" : "text-paper/40")}
                    style={{ minWidth: width }}
                  >
                    {numbers[i]}
                  </span>
                ) : null}
                <span className="flex-1 min-w-0 truncate">{s.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}
