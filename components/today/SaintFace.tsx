"use client";

import { useState, type CSSProperties } from "react";

import { cn } from "@/lib/cn";
import { ICON_FOCUS, type SaintPicture } from "@/lib/today/saintFaces";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

/**
 * The day's saint's face (1.8): on his band in The Church today and at the
 * top of his window. lib/today/saintFaces.ts chooses the picture: his cover
 * portrait from the website, else the icon the app carries.
 *
 * The portrait is asked for as AVIF first, as the reading room's covers are
 * (components/covers/WorkCover.tsx), and as its JPEG when the AVIF cannot be
 * had. When the portrait cannot be had at all (no signal), the icon the app
 * carries takes its place, and when that fails too there is no picture, never
 * a broken one.
 *
 * It arrives whole (build 85, note 52): unseen until it has loaded and
 * decoded, then it fades in on the app's motion switch, never a band at a
 * time (lib/ui/useArrivingImage.ts). One that loaded or failed before the
 * page could listen is read from the <img> itself.
 *
 * `zoom` brings the face closer for a small round frame, about the face.
 * The picture is decoration: the name beside it says who it is.
 */
export function SaintFace({ picture, zoom = 1, className }: { picture: SaintPicture; zoom?: number; className?: string }) {
  const sources = picture.kind === "cover" && picture.fallback ? [picture.src, picture.fallback] : [picture.src];
  const [at, setAt] = useState(0);
  const [jpegOnly, setJpegOnly] = useState(false);
  const src = sources[at];
  const cover = picture.kind === "cover" && at === 0;
  const avif = cover && !jpegOnly ? picture.avif : null;
  // The element is new for each source and for the JPEG after its AVIF (its key).
  const key = src ? (avif ? src : `${src}#jpeg`) : null;
  const failed = (img: HTMLImageElement) => {
    if (avif && img.currentSrc.endsWith(".avif")) setJpegOnly(true);
    else setAt((n) => n + 1);
  };
  const { ref, onArrive } = useArrivingImage(key, failed);
  if (!src) return null;
  const focusY = cover ? picture.focusY : ICON_FOCUS;
  const style: CSSProperties = {
    objectPosition: `50% ${focusY}%`,
    ...(zoom !== 1 ? { transform: `scale(${zoom})`, transformOrigin: `50% ${focusY}%` } : {}),
  };
  return (
    <picture className="contents">
      {avif ? <source type="image/avif" srcSet={avif} /> : null}
      <img
        key={key ?? undefined}
        ref={ref}
        src={src}
        alt=""
        aria-hidden
        decoding="async"
        onLoad={(e) => {
          // A picture that comes back at a pixel is no picture.
          if (e.currentTarget.naturalWidth > 1) onArrive(e);
          else setAt((n) => n + 1);
        }}
        onError={(e) => failed(e.currentTarget)}
        className={cn("img-arrive h-full w-full object-cover", className)}
        style={style}
      />
    </picture>
  );
}
