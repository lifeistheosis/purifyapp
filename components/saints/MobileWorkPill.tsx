"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useTranslate } from "@/components/i18n/MessagesProvider";

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
 * Hidden on `md+`, desktop has the in-page TOC.
 */
export function MobileWorkPill({
  sections,
}: {
  sections: { n: number; title: string }[];
}) {
  const { t } = useTranslate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);

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
        className="md:hidden fixed inset-x-0 z-40 flex justify-center pointer-events-none"
        style={{
          bottom:
            "calc(var(--tab-bar-h) + env(safe-area-inset-bottom, 0px) + 12px)",
        }}
      >
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-pill bg-night/95 backdrop-blur border border-white/15 shadow-raise pl-1 pr-1 py-1 max-w-[92vw]">
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
            ‹
          </button>
          <button
            type="button"
            onClick={() => setTocOpen(true)}
            className="px-3 h-10 inline-flex items-center font-sans text-detail font-semibold text-paper truncate max-w-[60vw]"
          >
            {t("saints.sectionOf", { n: current.n, total })}
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
            ›
          </button>
        </div>
      </div>

      <Sheet open={tocOpen} onClose={() => setTocOpen(false)} title={t("saints.contents")}>
        <ol className="grid grid-cols-1 gap-y-1 font-sans text-ui">
          {sections.map((s, i) => {
            const active = i === currentIdx;
            return (
              <li key={s.n}>
                <button
                  type="button"
                  onClick={() => {
                    setTocOpen(false);
                    jumpTo(s.n);
                  }}
                  className={
                    "w-full text-left flex items-baseline gap-3 py-2.5 px-2 rounded-md " +
                    (active
                      ? "bg-gold/10 text-paper"
                      : "text-paper/75 hover:bg-paper/[0.04]")
                  }
                >
                  <span
                    className={
                      "tabular-nums w-7 text-right font-semibold " +
                      (active ? "text-gold" : "text-paper/40")
                    }
                  >
                    {s.n}
                  </span>
                  <span className="flex-1 min-w-0 truncate">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </Sheet>
    </>
  );
}
