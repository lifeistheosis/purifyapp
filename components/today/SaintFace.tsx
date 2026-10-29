"use client";

import { useState, type CSSProperties } from "react";

import { cn } from "@/lib/cn";
import { ICON_FOCUS, type SaintPicture } from "@/lib/today/saintFaces";

/**
 * The day's saint's face (1.8): on his band in The Church today and at the
 * top of his window. lib/today/saintFaces.ts chooses the picture: his cover
 * portrait from the website, else the icon the app carries.
 *
 * The portrait is asked for as AVIF first, as the reading room's covers are
 * (components/covers/WorkCover.tsx), and as its JPEG when the AVIF cannot be
 * had. When the portrait cannot be had at all (no signal), the icon the app
 * carries takes its place, and when that fails too there is no picture, never
 * a broken one. The picture fades in once it has loaded, on the motion switch.
 *
 * `zoom` brings the face closer for a small round frame, about the face.
 * The picture is decoration: the name beside it says who it is.
 */
export function SaintFace({ picture, zoom = 1, className }: { picture: SaintPicture; zoom?: number; className?: string }) {
  const sources = picture.kind === "cover" && picture.fallback ? [picture.src, picture.fallback] : [picture.src];
  const [at, setAt] = useState(0);
  const [jpegOnly, setJpegOnly] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  const src = sources[at];
  if (!src) return null;
  const cover = picture.kind === "cover" && at === 0;
  const focusY = cover ? picture.focusY : ICON_FOCUS;
  const avif = cover && !jpegOnly ? picture.avif : null;
  const style: CSSProperties = {
    objectPosition: `50% ${focusY}%`,
    ...(zoom !== 1 ? { transform: `scale(${zoom})`, transformOrigin: `50% ${focusY}%` } : {}),
  };
  return (
    <picture className="contents">
      {avif ? <source type="image/avif" srcSet={avif} /> : null}
      <img
        key={avif ? src : `${src}#jpeg`}
        src={src}
        alt=""
        aria-hidden
        decoding="async"
        onLoad={(e) => {
          // A picture that comes back at a pixel is no picture.
          if (e.currentTarget.naturalWidth > 1) setLoaded(src);
          else setAt((n) => n + 1);
        }}
        onError={(e) => {
          if (avif && e.currentTarget.currentSrc.endsWith(".avif")) setJpegOnly(true);
          else setAt((n) => n + 1);
        }}
        className={cn(
          "h-full w-full object-cover opacity-0 transition-opacity duration-500 ease-[var(--ease-house)] motion-reduce:transition-none",
          loaded === src && "opacity-100",
          className,
        )}
        style={style}
      />
    </picture>
  );
}
