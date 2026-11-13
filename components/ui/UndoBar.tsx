"use client";

// The one bar that offers Undo after a removal (1.7: Saved, the journal). At
// the foot, over the tab bar and the mini player, in the flow bar's place
// (components/flow/FlowBarShell.tsx), for five seconds (lib/ui/useUndo.ts).
// It says so politely to a screen reader (role=status) and takes no focus:
// the reader's hand stays where it was.
//
// What floats in its band steps aside while it shows: the reader's pill and
// dock, a work's pill, the day's readings bar, a verse's tools
// (lib/ui/overlay.ts, toastRises; app/globals.css, "What steps aside for a
// toast"). Build 95 note 7: the Highlighted toast stood over the chapter
// pill, whose top showed above it. It comes 40ms after they begin to go, so
// the two never read through each other.

import { useLayoutEffect } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { toastRises } from "@/lib/ui/overlay";
import type { UndoEntry } from "@/lib/ui/useUndo";

export function UndoBar({ entry, onUndo }: { entry: UndoEntry | null; onUndo: () => void }) {
  const { t } = useTranslate();
  const showing = entry !== null;
  // Before the frame the bar is first drawn in, so what it would meet begins
  // to go in that same frame.
  useLayoutEffect(() => {
    if (!showing) return;
    return toastRises();
  }, [showing]);
  return (
    <div
      className="now-playing-lift pointer-events-none fixed inset-x-0 bottom-0 z-[55] px-3 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] md:pb-6"
      style={{ transform: "translateY(calc(-1 * var(--now-playing-h, 0px)))" }}
    >
      <div role="status" aria-live="polite" className="mx-auto max-w-md">
        {entry ? (
          <div data-undo-bar="" className="pointer-events-auto flex items-center gap-3 rounded-[18px] bg-night-soft py-1.5 pe-1.5 ps-4 shadow-[0_14px_34px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-paper/10 motion-safe:animate-[undo-in_220ms_cubic-bezier(0.22,1,0.36,1)_40ms_backwards]">
            <p className="min-w-0 flex-1 truncate font-sans text-ui text-paper">{entry.label}</p>
            <button
              type="button"
              onClick={onUndo}
              className="tap-press inline-flex min-h-11 shrink-0 items-center rounded-pill px-4 font-sans text-ui font-semibold text-paper hover:bg-paper/10"
            >
              {t("common.undo")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
