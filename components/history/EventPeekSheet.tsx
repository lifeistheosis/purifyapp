"use client";

// A first look at an event, on a phone or a tablet (1.7, the owner's note
// 20). A tap on a row of the line opens it in the shared movable sheet: the
// event's picture, its date and place, its title, the summary, and the way
// to the full account as the sheet's own last line. The line stays where it
// was underneath, so closing the sheet is a step back, not a page back.
// On a computer the same tap chooses the event for the rail beside the line.

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Close } from "@/components/ui/icons/Close";
import { Sheet } from "@/components/ui/Sheet";
import { eventBySlug } from "@/lib/history/events";
import { eraShort } from "@/lib/history/labels";
import { eventPicture } from "@/lib/history/media";
import { isNativeClient } from "@/lib/platform/native";

import { EventPlate } from "./EventPlate";

export function EventPeekSheet({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const { t } = useTranslate();
  const event = slug ? eventBySlug(slug) : undefined;
  // Asked of the device: the sheet is drawn only after a tap, never by the server.
  const picture = event ? eventPicture(event, isNativeClient()) : null;

  return (
    <Sheet
      open={Boolean(event)}
      onClose={onClose}
      title={event?.title ?? ""}
      desktop
      openFull
      header={
        <div className="flex items-center gap-3 px-4 pb-2">
          <p className="min-w-0 flex-1 truncate font-sans text-caption font-semibold text-paper/60 tabular-nums">
            {event ? (
              <>
                {eraShort(t, event.era)} · {event.displayDate}
                {event.region ? <> · {event.region}</> : null}
              </>
            ) : null}
          </p>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-paper/65 hover:text-paper"
          >
            <Close size={16} />
          </button>
        </div>
      }
    >
      {event ? (
        <div data-event-peek={event.slug}>
          {picture ? <EventPlate key={event.slug} picture={picture} priority className="mb-5" /> : null}
          <h2 className="text-title-sm leading-snug text-paper text-balance">{event.title}</h2>
          <p className="mt-3 font-sans text-ui leading-[1.65] text-paper/80">{event.summary}</p>
          <Link
            href={`/history/${event.slug}`}
            onClick={onClose}
            className="tap-press mt-6 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
          >
            {t("study.history.readFullAccount")}
            <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
          </Link>
        </div>
      ) : null}
    </Sheet>
  );
}
