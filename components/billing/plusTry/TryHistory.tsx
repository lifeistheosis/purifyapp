"use client";

// Try the timeline in full dress (r3-07 A): an event of the history as its
// page opens for Plus (components/history/EventPictures.tsx), the period
// artwork moving slowly in its frame (components/history/EventPlate.tsx with
// `pan`, globals.css .history-pan, still with motion turned down), its date,
// its name and its line, then the event's further pictures, which are Plus's
// own: here the Council of Ferrara–Florence and its three.
//
// The pictures are the website's, as they are for every reader of the
// history (lib/history/media.ts); the history itself, every event, source and
// citation, stays free. Its words are in English, as the history's are, with
// the history's own note where the reader's language is another.

import type { TryProps } from "@/components/billing/PlusTry";
import { EventPlate } from "@/components/history/EventPlate";
import { InEnglishNote } from "@/components/history/InEnglishNote";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { eventBySlug } from "@/lib/history/events";
import { eventGallery, eventPicture } from "@/lib/history/media";
import { isNativeClient } from "@/lib/platform/native";
import { TRY_EVENT } from "@/lib/premium/plusTry";

import { TryWindow } from "./TryKit";

export default function TryHistory({ row }: TryProps) {
  const { t } = useTranslate();
  const meta = eventBySlug(TRY_EVENT);
  const native = isNativeClient();
  const picture = meta ? eventPicture(meta, native) : null;
  const gallery = meta ? eventGallery(meta, native) : [];

  return (
    <TryWindow label={t(row.name)} tall>
      {meta ? (
        <div className="px-5 pb-16 pt-5">
          {picture ? <EventPlate picture={picture} pan priority /> : null}
          <div lang="en" className="mt-5">
            <p className="font-sans text-caption font-semibold tabular-nums text-paper/55">{meta.displayDate}</p>
            <h3 className="mt-1 text-title-sm font-bold leading-[1.15] text-paper">{meta.title}</h3>
            <p className="mt-2 font-serif text-body italic leading-[1.55] text-paper/75">{meta.preview}</p>
          </div>
          <InEnglishNote />
          {gallery.length > 0 ? (
            <section aria-label={t("study.history.morePicturesTitle")} className="mt-7 space-y-6">
              <p className="font-sans text-caption font-semibold text-paper/55">{t("study.history.morePicturesTitle")}</p>
              {gallery.map((g) => (
                <EventPlate key={g.src} picture={g} pan />
              ))}
            </section>
          ) : null}
        </div>
      ) : null}
    </TryWindow>
  );
}
