"use client";

// An event's picture (1.7, the owner's note 20 of 2026-10-16: History "needs
// ... photos"). One for every event that has one, for every reader: at the
// top of the event's page, in its peek sheet on a phone, and in the rail
// beside the line on a computer.
//
// Two shapes, chosen by the picture (lib/history/events.ts, media.shape):
//   wide   a 16:9 plate the picture fills, its subject placed by `focus`.
//   whole  an icon, a miniature or a tall painting, shown whole at its own
//          proportions and never cut through a face, its height held to the
//          screen.
// The credit (work, artist, licence) sits at the plate's foot, always: an
// attribution licence stays satisfied without anyone remembering to add it.
//
// The picture lives on the website (lib/history/media.ts). Until it arrives
// the plate holds its own size; if it cannot arrive (no signal in the apps)
// the plate is gone, with no empty box left behind, and the account stands
// alone.
//
// `pan` is Immersive History (Purify Plus): the picture moves, slowly, inside
// its frame, only with the app's motion on (globals.css, .history-pan).

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { wholePlateWidth, type EventPicture } from "@/lib/history/media";

export function EventPlate({
  picture,
  pan = false,
  priority = false,
  className,
}: {
  picture: EventPicture;
  pan?: boolean;
  /** The page's first picture: asked for at once. */
  priority?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  // A picture that failed before the page could listen (the website's first
  // paint) is caught here, so a broken picture never shows.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return null;

  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- streamed from the website, served as it is.
    <img
      ref={ref}
      src={picture.src}
      alt={picture.alt}
      width={picture.width}
      height={picture.height}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      onError={() => setFailed(true)}
      style={picture.shape === "wide" && picture.focus ? { objectPosition: picture.focus } : undefined}
      className={cn(
        picture.shape === "wide" ? "absolute inset-0 h-full w-full object-cover" : "block h-auto w-full",
        pan && "history-pan",
      )}
    />
  );

  const credit = (
    <figcaption className="mt-2 font-sans text-[11px] leading-snug text-paper/50">{picture.credit}</figcaption>
  );

  if (picture.shape === "whole") {
    // The frame is the picture's size before the picture is there (lib/history/media.ts,
    // wholePlateWidth), so the account under it never moves when it arrives.
    return (
      <figure data-event-plate="whole" className={cn("flex flex-col items-center", className)}>
        <div
          className="overflow-hidden rounded-[12px] bg-night-soft ring-1 ring-paper/10"
          style={{ width: wholePlateWidth(picture) }}
        >
          {img}
        </div>
        {credit}
      </figure>
    );
  }

  return (
    <figure data-event-plate="wide" className={className}>
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[12px] bg-night-soft ring-1 ring-paper/10">
        {img}
      </div>
      {credit}
    </figure>
  );
}
