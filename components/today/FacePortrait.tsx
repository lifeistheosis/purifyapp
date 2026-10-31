"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { placePortrait, type BandSide } from "@/lib/today/saintFaces";

/** A face for a band: the picture, its AVIF, the point of his face on it, and the picture the app carries for when it cannot be had. */
export type BandFace = {
  src: string;
  avif: string | null;
  point: readonly [number, number];
  fallback: { src: string; point: readonly [number, number] } | null;
};

/**
 * The speaker's portrait on a band of The Church today (1.8, round 3 r3-21,
 * the owner's pick A, "The face beside the words"): on the side he looks
 * from, his face where the sheet set it (lib/today/saintFaces.ts,
 * placePortrait), fading into the band's ground by the masks in
 * app/globals.css (.today-face-*).
 *
 * It never paints in halves (the owner's build 81 photos: pictures that
 * "load in spiratically"). It waits unseen until every byte is in and
 * decoded, then fades in on the app's motion switch, as an event's plate does
 * (components/history/EventPlate.tsx); with motion off it is simply there. A
 * cover is asked for as AVIF first and as its JPEG when the AVIF cannot be
 * had; when neither can (no signal), the picture the app carries takes its
 * place where there is one, and when nothing can be had there is no picture,
 * never a broken one: `onGone` tells the band, which then stands without a
 * face.
 *
 * Placed by measure, not by CSS alone: the picture's size follows the band's
 * height while his face lands at a share of its width, and no one CSS length
 * can hold both. The band is measured as it lays out and whenever it changes
 * (its words wrap again, the phone turns), and the picture is shown only once
 * it is placed. The picture is decoration: the band names him in words.
 */
export function FacePortrait({ face, side, onGone }: { face: BandFace; side: BandSide; onGone?: () => void }) {
  const box = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [carried, setCarried] = useState(false);
  const [jpegOnly, setJpegOnly] = useState(false);
  const [arrived, setArrived] = useState<{ src: string; aspect: number } | null>(null);
  const [gone, setGone] = useState(false);

  const pic = carried && face.fallback ? { src: face.fallback.src, point: face.fallback.point, avif: null } : face;
  const avif = pic.avif && !jpegOnly ? pic.avif : null;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Its laid-out size: a pressed band's dip (a scale) is not a new size.
    const read = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setSize((was) => (was && was.width === width && was.height === height ? was : { width, height }));
    };
    // The observer reports the band's size once it is laid out, and again
    // whenever it changes; a web view without one reads it once.
    if (typeof ResizeObserver === "undefined") {
      const frame = requestAnimationFrame(read);
      return () => cancelAnimationFrame(frame);
    }
    const watch = new ResizeObserver(read);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  const fail = (img: HTMLImageElement) => {
    if (avif && img.currentSrc.endsWith(".avif")) setJpegOnly(true);
    else if (!carried && face.fallback) {
      setCarried(true);
      setJpegOnly(false);
    } else {
      setGone(true);
      onGone?.();
    }
  };
  const land = (img: HTMLImageElement) => {
    // A picture that comes back at a pixel is no picture.
    if (img.naturalWidth <= 1) {
      fail(img);
      return;
    }
    const src = pic.src;
    const aspect = img.naturalWidth / img.naturalHeight;
    // Shown once it is decoded too, so it never paints in bands.
    const show = () => setArrived({ src, aspect });
    img.decode().then(show, show);
  };

  if (gone) return null;
  const place = size && arrived?.src === pic.src ? placePortrait(size, pic.point, side, arrived.aspect) : null;

  return (
    <span
      ref={box}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-10", side === "left" ? "today-face-left" : "today-face-right")}
    >
      <span className="today-face-foot absolute inset-0">
        <picture className="contents">
          {avif ? <source type="image/avif" srcSet={avif} /> : null}
          <img
            key={avif ? pic.src : `${pic.src}#jpeg`}
            src={pic.src}
            alt=""
            decoding="async"
            onLoad={(e) => land(e.currentTarget)}
            onError={(e) => fail(e.currentTarget)}
            data-face-shown={place ? "" : undefined}
            className={cn(
              "absolute left-0 top-0 max-w-none opacity-0 motion-safe:transition-opacity motion-safe:duration-500 motion-safe:ease-house",
              place && "opacity-100",
            )}
            style={place ? { left: place.left, top: place.top, width: place.width, height: place.height } : { width: 1, height: 1 }}
          />
        </picture>
      </span>
    </span>
  );
}
