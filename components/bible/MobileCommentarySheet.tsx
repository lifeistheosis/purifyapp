"use client";

import { useEffect, useState } from "react";
import type { ChapterCommentary } from "@/lib/bible/load";
import { SaintIcon } from "./SaintIcon";

/**
 * Mobile-only bottom sheet that shows patristic commentary for a single
 * verse. Replaces the collapsed `<details>` block that used to live at
 * the foot of the chapter on mobile. Desktop continues to use the
 * sticky right-rail (StudyRail) untouched.
 *
 * The sheet is keyed on `verse`; when `verse` is null, the sheet is
 * closed. We delay unmounting one tick so the slide-down animation can
 * play.
 */
export function MobileCommentarySheet({
  bookName,
  chapter,
  verse,
  commentary,
  onClose,
}: {
  bookName: string;
  chapter: number;
  verse: number | null;
  commentary: ChapterCommentary;
  onClose: () => void;
}) {
  // Track whether the sheet is mounted (so we can run the close animation
  // before unmount) and whether it's visually "shown" (so we can play the
  // slide-in animation on first paint).
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  // Drive the mount-with-animation phases off the `verse` prop. The
  // setStates here are unavoidable: the slide-in/out timing isn't React
  // state, it's coupled to the DOM. Pattern matches other delayed-unmount
  // animations elsewhere in the codebase.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (verse !== null) {
      setMounted(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    } else {
      setShown(false);
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [verse]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Lock body scroll while open.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  // Close on Escape.
  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  if (!mounted) return null;

  const notes = verse !== null ? commentary[String(verse)] ?? [] : [];

  return (
    <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close commentary"
        onClick={onClose}
        className={
          "absolute inset-0 bg-night/70 backdrop-blur-sm transition-opacity duration-200 " +
          (shown ? "opacity-100" : "opacity-0")
        }
      />
      {/* Sheet */}
      <div
        className={
          "absolute inset-x-0 bottom-0 max-h-[85dvh] flex flex-col rounded-t-3xl border-t border-paper/15 bg-night shadow-[0_-12px_40px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out " +
          (shown ? "translate-y-0" : "translate-y-full")
        }
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <span
            aria-hidden
            className="block h-1 w-10 rounded-full bg-paper/25"
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-paper/10">
          <div className="min-w-0">
            <p className="font-sans text-[10.5px] font-semibold uppercase tracking-[1.5px] text-paper/55">
              Patristic commentary
            </p>
            <p className="mt-0.5 font-serif text-[17px] text-paper truncate">
              {bookName} {chapter}:{verse}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 h-11 w-11 rounded-full flex items-center justify-center text-paper/65 hover:text-paper hover:bg-paper/[0.06] transition-colors"
          >
            <span aria-hidden className="text-[20px] leading-none">×</span>
          </button>
        </div>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">
          {notes.length === 0 ? (
            <p className="font-sans text-[13px] text-paper/55 text-center py-10">
              No commentary for this verse.
            </p>
          ) : (
            notes.map((n, i) => (
              <article
                key={i}
                className="rounded-md border border-paper/10 bg-paper/[0.03] p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <SaintIcon author={n.author} size="sm" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="font-sans text-[10.5px] font-semibold uppercase tracking-[1px] text-paper/75 truncate">
                      {n.author}
                    </p>
                    <p className="font-sans text-[11px] italic text-paper/50 truncate">
                      {n.work}
                    </p>
                  </div>
                </div>
                <p className="font-serif text-[14.5px] leading-[1.6] text-paper/85">
                  {n.text}
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
