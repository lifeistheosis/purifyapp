"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { updateWallNames, useWallNames } from "@/lib/prayers/useWallNames";
import {
  WALL_FOR,
  WALL_FOR_LABEL,
  activeWallName,
  addWallName,
  markWallPrayed,
  moveWallName,
  type WallFor,
} from "@/lib/prayers/wallNames";

/** A request on the wall, as the reader saw it: the only thing carried into their prayers. */
export type WallPick = { id: string; name: string; intention: string | null };

/**
 * Add someone from the prayer wall to the reader's own prayers (1.7.1): the
 * next morning, midday or evening prayers, or whichever comes next today. The
 * name and the words they asked with go into the reader's prayers on this
 * device (lib/prayers/wallNames.ts), and nothing else of theirs. Opened again
 * on someone already added, it moves them to other prayers or takes them out.
 */
export function AddToPrayersSheet({
  open,
  pick,
  onClose,
  onDone,
}: {
  open: boolean;
  pick: WallPick | null;
  onClose: () => void;
  /** What happened, for the wall to say. */
  onDone: (message: string) => void;
}) {
  const { t } = useTranslate();
  const list = useWallNames();
  const existing = pick ? activeWallName(list, pick.id) : null;
  const [choice, setChoice] = useState<WallFor | null>(null);
  const chosen: WallFor = choice ?? existing?.for ?? "today";

  function keep() {
    if (!pick) return;
    updateWallNames((names) => (existing ? moveWallName(names, pick.id, chosen) : addWallName(names, pick, chosen)));
    onDone(t("community.wallAdded"));
  }

  function takeOut() {
    if (!pick) return;
    updateWallNames((names) => markWallPrayed(names, [pick.id]));
    onDone(t("community.wallTakenOut"));
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("community.wallAdd")} desktop openFull>
      {pick ? (
        <div className="pb-1 pt-1">
          <p className="break-words font-serif text-lede text-paper">{pick.name}</p>
          {pick.intention ? (
            <p className="mt-1 break-words font-sans text-detail leading-relaxed text-paper/70">{pick.intention}</p>
          ) : null}

          <p id="wall-for-label" className="mt-5 font-sans text-detail font-semibold text-paper/80">
            {t("community.wallAddWhen")}
          </p>
          <div
            role="radiogroup"
            aria-labelledby="wall-for-label"
            className="mt-2 divide-y divide-paper/8 overflow-hidden rounded-2xl border border-paper/10"
          >
            {WALL_FOR.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={chosen === f}
                onClick={() => setChoice(f)}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  chosen === f ? "bg-paper/[0.06]" : "hover:bg-paper/[0.03]",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-ui font-semibold text-paper">{t(WALL_FOR_LABEL[f])}</span>
                  {f === "today" ? (
                    <span className="block font-sans text-caption text-paper/55">{t("community.wallForTodayHint")}</span>
                  ) : null}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full",
                    chosen === f ? "bg-paper text-night" : "ring-1 ring-inset ring-paper/35",
                  )}
                >
                  {chosen === f ? <Check size={12} /> : null}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-3 font-sans text-caption leading-relaxed text-paper/55">{t("community.wallAddNote")}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={keep}
              className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90"
            >
              {existing ? t("common.save") : t("community.wallAdd")}
            </button>
            {existing ? (
              <button
                type="button"
                onClick={takeOut}
                className="inline-flex min-h-11 items-center rounded-pill border border-paper/25 px-5 font-sans text-detail font-semibold text-paper/85 transition-colors hover:border-paper/45"
              >
                {t("community.wallTakeOut")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
