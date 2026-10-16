"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useReadingProgress } from "@/lib/reading/progress";
import type { TileCard } from "@/lib/reading/select";
import { useMounted } from "@/lib/useMounted";

import { CoverRow, CoverTile, cardMeta } from "./CoverRow";

/**
 * The foot of a work (1.7): a quiet line once the reader has reached its
 * last section on this device, then More like this, a row of the works that
 * share its themes, its author or its tradition (lib/reading/select.ts,
 * moreLikeThis). The next step, so a finished book is not a dead end (the
 * owner's pattern 4 of 2026-10-16).
 */
export function MoreLikeThis({ workKey, cards }: { workKey: string; cards: TileCard[] }) {
  const { t } = useTranslate();
  const mounted = useMounted();
  const progress = useReadingProgress();
  const done = mounted && Boolean(progress[workKey]?.done);
  // Drawn once the page has woken: it is the foot of a long page, and written
  // into the HTML of all 130 works it would weigh on the apps' bundle, which
  // is at its ceiling (lib/build/exportSize.ts).
  if (!mounted || (cards.length === 0 && !done)) return null;
  return (
    <div data-more-like-this="" className="pb-28 pt-2 md:pb-16">
      {done ? <p className="font-sans text-ui text-paper/65">{t("reading.work.finished")}</p> : null}
      {cards.length ? (
        <CoverRow id="more-like-this" title={t("reading.work.moreLikeThis")} className={done ? "mt-6" : "mt-0"}>
          {cards.map((c) => (
            <CoverTile key={c.key} card={c} meta={cardMeta(c, t)} />
          ))}
        </CoverRow>
      ) : null}
    </div>
  );
}
