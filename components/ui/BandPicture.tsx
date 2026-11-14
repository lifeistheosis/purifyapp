"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * A gallery band's picture as one layer (./GalleryBand.tsx): the card's grey
 * while the picture comes, its blurred preview, and the picture, faded along
 * the start by the shade's own figures as a mask.
 *
 * A picture that does not come leaves nothing (the arbiter's word of
 * 2026-11-11, the councils' bands, as an event's plate since build 93 note
 * 5): the whole layer goes, its grey with it, and the band stands on its own
 * ground with its words. An AVIF offered first that fails falls back to the
 * JPEG, since a <picture> whose chosen source fails tries no other by itself:
 * the apps carry the councils' AVIFs (lib/media/carried.ts) and keep the
 * website's JPEG behind them, for a phone that cannot draw an AVIF.
 */
export function BandPicture({
  picture,
  avif,
  preview,
  credit,
  focus,
  tall,
  priority,
  carry,
}: {
  picture: string;
  avif?: string;
  preview?: string;
  credit?: string;
  focus: string;
  tall: boolean;
  priority: boolean;
  /** Travels into the page its band opens, as that page's head (lib/ui/routeMotion.ts, data-carry). */
  carry?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const [jpegOnly, setJpegOnly] = useState(false);
  const fail = (img: HTMLImageElement) => {
    if (avif && !jpegOnly && img.currentSrc.endsWith(".avif")) setJpegOnly(true);
    else setFailed(true);
  };

  // A picture that failed before the page could listen (the website's first
  // paint) is read from the <img> itself.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) fail(img);
    // Once, as the band is drawn: a later failure is the <img>'s own error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) return null;
  return (
    <span aria-hidden data-band-picture="" data-carry={carry} className={cn("absolute inset-0 bg-night-soft", tall ? "band-picture-tall" : "band-picture")}>
      {preview ? <span className="absolute inset-0 scale-110 bg-cover bg-center blur-md" style={{ backgroundImage: `url(${preview})` }} /> : null}
      <picture className="contents">
        {avif && !jpegOnly ? <source type="image/avif" srcSet={avif} /> : null}
        {/* A plain <img> in a <picture>: a static export serves files as
            they are, and next/image would add nothing. */}
        <img
          key={jpegOnly ? "jpeg" : "first"}
          ref={ref}
          src={picture}
          alt=""
          title={credit}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={(e) => fail(e.currentTarget)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: focus }}
        />
      </picture>
    </span>
  );
}
