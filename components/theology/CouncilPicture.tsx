"use client";

import { useState, type CSSProperties } from "react";

import { ArrivingImage } from "@/components/ui/ArrivingImage";

/**
 * A council's own picture where Theology draws it small: the hub's film of
 * the seven, a step's read on a path, a council's mark beside its name.
 *
 * The apps carry History's pictures of the seven Ecumenical Councils as the
 * AVIF alone and keep the website's JPEG behind them (lib/media/carried.ts,
 * CARRIED_HISTORY; lib/history/media.ts, historyMediaSrc). So the AVIF is
 * offered first, as a council's band and an event's plate offer it
 * (components/ui/BandPicture.tsx): with no signal the picture is drawn from
 * the app's own file. Until the gate's third run (2026-11-11) these three
 * places asked for the JPEG alone, and with no signal each frame stood
 * empty: six pictures on four of Theology's screens.
 *
 * An AVIF that fails falls back to the JPEG, since a <picture> whose chosen
 * source fails tries no other by itself: a phone that cannot draw an AVIF
 * still has the website's. It arrives whole over whatever the caller draws
 * under it (components/ui/ArrivingImage.tsx).
 */
export function CouncilPicture({
  src,
  avif,
  credit,
  focus,
  className,
}: {
  /** The JPEG: the website's own file on the website, the website's address in the apps. */
  src: string;
  /** The same picture as AVIF: the bundle's own in the apps. */
  avif?: string;
  credit?: string;
  /** Where the picture is cut (CSS object-position). */
  focus?: string;
  className?: string;
}) {
  const [jpegOnly, setJpegOnly] = useState(false);
  const fail = (img: HTMLImageElement) => {
    if (avif && !jpegOnly && img.currentSrc.endsWith(".avif")) setJpegOnly(true);
  };
  const style: CSSProperties | undefined = focus ? { objectPosition: focus } : undefined;
  return (
    <picture className="contents">
      {avif && !jpegOnly ? <source type="image/avif" srcSet={avif} /> : null}
      <ArrivingImage
        key={jpegOnly ? "jpeg" : "first"}
        src={src}
        title={credit}
        loading="lazy"
        decoding="async"
        onError={(e) => fail(e.currentTarget)}
        onBroken={fail}
        className={className}
        style={style}
      />
    </picture>
  );
}
