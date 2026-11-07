"use client";

// The preview of Plus's history (1.9): the Thread. Until 1.9 it showed
// Florence's picture moving and its more pictures, which are every reader's
// now (the owner's "I want images on for everyone"); Plus's history is the
// event told year by year with a map that follows it (his pick of
// 2026-11-06, with his extras of 2026-11-07). Six of the Council of
// Florence's steps, as lib/premium/plusTry.ts writes them out, under the map.

import type { TryProps } from "@/components/billing/PlusTry";
import { Thread } from "@/components/history/EventThread";
import { InEnglishNote } from "@/components/history/InEnglishNote";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { eventBySlug } from "@/lib/history/events";
import { TRY_EVENT, TRY_THREAD } from "@/lib/premium/plusTry";

import { TryWindow } from "./TryKit";

export default function TryHistory({ row }: TryProps) {
  const { t } = useTranslate();
  const meta = eventBySlug(TRY_EVENT);

  return (
    <TryWindow label={t(row.name)} tall>
      {meta ? (
        <div className="px-5 pb-16 pt-5">
          <div lang="en">
            <p className="font-sans text-caption font-semibold tabular-nums text-paper/55">{meta.displayDate}</p>
            <h3 className="mt-1 text-title-sm font-bold leading-[1.15] text-paper">{meta.title}</h3>
          </div>
          <InEnglishNote />
          <div lang="en">
            <Thread steps={TRY_THREAD.steps} home={TRY_THREAD.home} />
          </div>
        </div>
      ) : null}
    </TryWindow>
  );
}
