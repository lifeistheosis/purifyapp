"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import type { EventPicture } from "@/lib/history/media";

/**
 * The council's icon at the head of its page (1.8, the owner's pick of
 * r3-03, C's "Nicaea, at a glance"): across the top of a phone from its very
 * edge, under the clear top bar, and melting into the page where the
 * council's name is set over its foot (the saint's page's own hero,
 * components/saints/SaintHeroPicture.tsx, `.under-topbar` and
 * `.picture-melt` in globals.css). On a tablet and a computer a rounded
 * picture above the name.
 *
 * It is History's picture of the council (lib/history/media.ts), on the
 * website and asked of the website by the apps. It opens on its own preview,
 * blurred, and fades in once it has loaded and decoded (on the app's motion
 * switch); with no signal there is no picture, and the page keeps its place
 * with the preview, or the ground, under the name. The credit is the
 * picture's title, and the page prints it at its foot.
 *
 * With Purify Plus the picture moves, slowly, inside its frame, as it did on
 * the council's page before (Immersive History, `.history-pan`, only with
 * the app's motion on).
 */
export function CouncilHero({ picture, focus }: { picture: EventPicture; focus: string }) {
  const plus = usePlusFeatures();
  const ref = useRef<HTMLImageElement>(null);
  const [arrived, setArrived] = useState(false);
  const [failed, setFailed] = useState(false);
  const [jpegOnly, setJpegOnly] = useState(false);

  // A picture that loaded or failed before the page could listen.
  useEffect(() => {
    const img = ref.current;
    if (!img || !img.complete || !img.currentSrc) return;
    if (img.naturalWidth > 0) setArrived(true);
    else if (picture.avif && !jpegOnly && img.currentSrc.endsWith(".avif")) setJpegOnly(true);
    else setFailed(true);
  }, [picture.avif, jpegOnly]);

  return (
    <div
      data-council-hero=""
      className={cn(
        "saint-icon-in under-topbar relative -mx-5 aspect-[39/25] overflow-hidden bg-night",
        "md:mx-0 md:aspect-[16/7] md:rounded-[14px] md:ring-1 md:ring-inset md:ring-paper/10",
        "picture-melt",
      )}
    >
      {picture.preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- a data address, 24px wide.
        <img
          aria-hidden
          alt=""
          src={picture.preview}
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
          style={{ objectPosition: focus }}
        />
      ) : null}
      {failed ? null : (
        <picture className="contents">
          {picture.avif && !jpegOnly ? <source type="image/avif" srcSet={picture.avif} /> : null}
          <img
            key={jpegOnly ? "jpeg" : "first"}
            ref={ref}
            src={picture.src}
            alt={picture.alt}
            title={picture.credit}
            width={picture.width}
            height={picture.height}
            decoding="async"
            fetchPriority="high"
            onLoad={(e) => {
              const done = () => setArrived(true);
              e.currentTarget.decode().then(done, done);
            }}
            onError={(e) => {
              if (picture.avif && !jpegOnly && e.currentTarget.currentSrc.endsWith(".avif")) setJpegOnly(true);
              else setFailed(true);
            }}
            data-hero-picture={arrived ? "shown" : "waiting"}
            className={cn(
              "absolute inset-0 h-full w-full object-cover motion-safe:transition-opacity motion-safe:duration-500 motion-safe:ease-out",
              arrived ? "opacity-100" : "opacity-0",
              plus === true && "history-pan",
            )}
            style={{ objectPosition: focus }}
          />
        </picture>
      )}
      {/* The clock and the bar's plates stay readable over the picture. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-night/70 to-transparent md:hidden" />
    </div>
  );
}
