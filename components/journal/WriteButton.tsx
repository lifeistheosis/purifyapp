"use client";

// The journal's one way to write (1.7, the owner's note 23: "one Write
// button always in reach"). On a phone, and on a tablet in the apps, a paper
// pill at the foot of the screen, over the tab bar and the mini player, the
// way the flow bars stand (components/flow/FlowBarShell.tsx). On a computer
// it sits at the end of the title row instead (`placement="inline"`).
//
// Plus is shown, never hidden: without it the pill carries the Plus mark and
// opens the upgrade sheet named for the journal.

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PREMIUM_CHIP } from "@/components/premium/PremiumUI";
import { Pen } from "@/components/ui/icons/Pen";
import { cn } from "@/lib/cn";

export function WriteButton({
  onClick,
  locked,
  draft,
  placement,
}: {
  onClick: () => void;
  locked: boolean;
  /** A draft is waiting: the pill says it will go on with it. */
  draft: boolean;
  placement: "foot" | "inline";
}) {
  const { t } = useTranslate();
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
      {draft && !locked ? t("journal.continueWriting") : t("journal.write")}
      {locked ? <span className={cn(PREMIUM_CHIP, "ms-1")}>{t("study.purifyPlus")}</span> : null}
    </button>
  );
  if (placement === "inline") return button;
  return (
    <div
      className="now-playing-lift pointer-events-none fixed inset-x-0 bottom-0 z-[50] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden native-md-flex"
      style={{ transform: "translateY(calc(-1 * var(--now-playing-h, 0px)))" }}
    >
      {button}
    </div>
  );
}
