"use client";

// The head picture of an event's page, and its more pictures (1.7).
//
// Every reader's, all of it (1.9, the owner's words of 2026-11-06: "I want
// images on for everyone", always in full dress): the picture moving,
// slowly, inside its frame (only with the app's motion on), and an event
// with more pictures offering them in a sheet. Until 1.9 the motion and the
// more pictures were Immersive History, Plus's; Plus's history is now the
// Thread (components/history/EventThread.tsx).
//
// The addresses are decided on the server (lib/history/media.ts), so the
// first paint and the hydrated page agree.

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Sheet } from "@/components/ui/Sheet";
import type { EventPicture } from "@/lib/history/media";

import { EventPlate } from "./EventPlate";

export function EventPictures({
  picture,
  gallery,
  className,
}: {
  picture: EventPicture | null;
  gallery: EventPicture[];
  className?: string;
}) {
  const { t, tn } = useTranslate();
  const [open, setOpen] = useState(false);

  if (!picture && !gallery.length) return null;

  return (
    <div className={className}>
      {picture ? <EventPlate picture={picture} pan priority /> : null}
      {gallery.length ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="tap-press mt-3 flex min-h-11 w-full items-center gap-2 border-b border-paper/8 pb-2 text-start font-sans text-detail font-semibold text-paper/75 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          <span className="min-w-0 flex-1 truncate">{tn("study.history.morePictures", gallery.length)}</span>
          <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
        </button>
      ) : null}
      {gallery.length ? (
        <Sheet open={open} onClose={() => setOpen(false)} title={t("study.history.morePicturesTitle")} desktop>
          {gallery.map((g) => (
            <EventPlate key={g.src} picture={g} pan className="mb-6" />
          ))}
        </Sheet>
      ) : null}
    </div>
  );
}
