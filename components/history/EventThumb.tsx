"use client";

// An event's picture on the timeline's list (1.9, the owner's pick for the
// history timeline, "a mix of A and B": the prominent events large, the
// smaller ones as rows with a picture; pictures for everyone).
//
// The list's own crop of the picture the event's page shows whole
// (EventPlate): a frame of the size the list asks for, the picture filling
// it. The website's AVIF first and its JPEG when that is missing; streamed
// from the website in the apps, like every history picture
// (lib/history/media.ts). A picture that cannot arrive takes its frame with
// it, so a row offline is its words alone and never an empty box. No credit
// here: the event's page carries it under the whole picture.

import { useState } from "react";

import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { cn } from "@/lib/cn";
import type { HistoryEventMeta } from "@/lib/history/events";
import { eventPicture } from "@/lib/history/media";
import { useIsNative } from "@/lib/platform/native";

/**
 * Where an icon painted whole is cropped: its faces sit in its upper part. A
 * wide frame shows less than half of a tall icon, so it is cut from nearer
 * the top than a square one, which shows most of it.
 */
const WHOLE_FOCUS = { wide: "50% 10%", square: "50% 25%" } as const;

export function EventThumb({
  event,
  frameClassName,
  sizes,
  frame,
}: {
  event: HistoryEventMeta;
  /** The frame's size and shape; the picture fills it. */
  frameClassName: string;
  /** How wide it is drawn, for the browser's choice of what to fetch first. */
  sizes: string;
  /** The frame's shape, for where a tall icon is cut. */
  frame: "wide" | "square";
}) {
  const native = useIsNative();
  const picture = eventPicture(event, native);
  const [jpegOnly, setJpegOnly] = useState(false);
  const [gone, setGone] = useState(false);
  // A picture that cannot be had (with no signal: the apps ask the website for
  // it) keeps its frame, its own tiny preview blurred in it, so the row keeps
  // its height and nothing round it moves. It took its frame away, and a row a
  // reader had been brought to rose 237px as the rows above it lost theirs
  // (the gate's final run of 2026-11-12). One with no preview leaves.
  if (!picture || (gone && !picture.preview)) return null;

  const src = picture.avif && !jpegOnly ? picture.avif : picture.src;
  const broken = () => (src !== picture.src ? setJpegOnly(true) : setGone(true));
  return (
    <span aria-hidden className={cn("relative block overflow-hidden bg-night-soft ring-1 ring-inset ring-paper/10", frameClassName)}>
      {gone ? (
        <span
          data-thumb-preview=""
          className="absolute inset-0 scale-110 bg-cover blur-md"
          style={{
            backgroundImage: `url("${picture.preview}")`,
            backgroundPosition: picture.shape === "wide" && picture.focus ? picture.focus : WHOLE_FOCUS[frame],
          }}
        />
      ) : (
        <ArrivingImage
          src={src}
          sizes={sizes}
          loading="lazy"
          decoding="async"
          onBroken={broken}
          onError={broken}
          style={{ objectPosition: picture.shape === "wide" && picture.focus ? picture.focus : WHOLE_FOCUS[frame] }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}
