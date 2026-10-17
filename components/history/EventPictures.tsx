"use client";

// The head picture of an event's page, and Immersive History (1.7).
//
// The one picture is every reader's (the owner wants photos for History; a
// picture is part of an event's structure, as a saint's icon is). Immersive
// History is the Plus layer over it: with Plus the picture moves, slowly,
// inside its frame (only with the app's motion on), and an event with more
// pictures offers them in a sheet. Without Plus the row of more pictures is
// still there, with the Plus mark, and opens the upgrade sheet named for
// History: a Plus feature is never hidden (components/billing/PlusMark.tsx).
//
// The addresses are decided on the server (lib/history/media.ts), so the
// first paint and the hydrated page agree.

import { useState } from "react";

import { PlusMark } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Sheet } from "@/components/ui/Sheet";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
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
  const plus = usePlusFeatures();
  const upgrade = useUpgradeModal();
  const [open, setOpen] = useState(false);

  if (!picture && !gallery.length) return null;
  const locked = plus === false;

  return (
    <div className={className}>
      {picture ? <EventPlate picture={picture} pan={plus === true} priority /> : null}
      {gallery.length ? (
        <button
          type="button"
          onClick={() => (locked ? upgrade.open("history") : setOpen(true))}
          aria-haspopup="dialog"
          className="tap-press mt-3 flex min-h-11 w-full items-center gap-2 border-b border-paper/8 pb-2 text-start font-sans text-detail font-semibold text-paper/75 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          <span className="min-w-0 flex-1 truncate">{tn("study.history.morePictures", gallery.length)}</span>
          {locked ? <PlusMark /> : <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />}
        </button>
      ) : null}
      {gallery.length && !locked ? (
        <Sheet open={open} onClose={() => setOpen(false)} title={t("study.history.morePicturesTitle")} desktop>
          {gallery.map((g) => (
            <EventPlate key={g.src} picture={g} pan className="mb-6" />
          ))}
        </Sheet>
      ) : null}
    </div>
  );
}
