"use client";

// The journal's one way to write (1.7, the owner's note 23: "one Write
// button always in reach"). On a phone, and on a tablet in the apps, a paper
// pill at the foot of the screen, over the tab bar and the mini player, the
// way the flow bars stand (components/flow/FlowBarShell.tsx). On a computer
// it sits at the end of the title row instead (`placement="inline"`).
//
// Everyone writes, from 1.9 (docs/1.9-build/JOURNAL.md): the pill no longer
// carries the Plus mark.

import type { CSSProperties } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Pen } from "@/components/ui/icons/Pen";
import { cn } from "@/lib/cn";
import { useKeyboardUp } from "@/lib/ui/viewport";

export function WriteButton({
  onClick,
  draft,
  placement,
}: {
  onClick: () => void;
  /** A draft is waiting: the pill says it will go on with it. */
  draft: boolean;
  placement: "foot" | "inline";
}) {
  const { t } = useTranslate();
  const keyboard = useKeyboardUp();
  const button = (
    <button
      type="button"
      onClick={onClick}
      data-journal-write=""
      className={cn(
        "tap-press inline-flex h-12 items-center gap-2 rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night motion-safe:transition-colors hover:bg-paper/90",
        placement === "foot" && "pointer-events-auto shadow-[0_14px_34px_rgba(0,0,0,0.45)]",
      )}
    >
      <Pen size={18} className="shrink-0" />
      {draft ? t("journal.continueWriting") : t("journal.write")}
    </button>
  );
  if (placement === "inline") return button;
  // While a field of the journal's own has the keyboard (its search), the
  // button stands down: it rode up on the keyboard and lay over the field
  // being typed in (build 95, the walk with a keyboard of 320px).
  if (keyboard) return null;
  return (
    <div
      className="now-playing-lift pointer-events-none fixed inset-x-0 bottom-0 z-[50] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden native-md-flex"
      style={
        {
          transform: "translateY(calc(-1 * var(--now-playing-h, 0px)))",
          // How far this stands off the foot of the screen, for the fade under it (globals.css, .pill-fade).
          "--pill-lift": "calc(var(--tab-bar-h, 0px) + var(--now-playing-h, 0px) + env(safe-area-inset-bottom, 0px))",
        } as CSSProperties
      }
    >
      {/* The fade the chapter's pill floats on (components/bible/
          MobileChapterPill.tsx): the list's words go quiet as they near the
          button, and none runs raw under it. Until build 95 the button lay
          straight on the words: on arrival, over the first entry's own line.
          Always there: with it off for an empty journal, the button lay on
          the line under the journal's first question (seen on the export). */}
      <span aria-hidden className="pill-fade pointer-events-none absolute inset-x-0 -z-10" />
      {button}
    </div>
  );
}
