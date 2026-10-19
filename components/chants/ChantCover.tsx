"use client";

import { useState } from "react";

import { chantMediaUrl, isStreamed } from "@/lib/chants/media";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/useMounted";

/**
 * A chant's cover (1.7): its public-domain icon, square, or with no picture
 * (or none reachable: a streamed cover with no signal) the plain plate, the
 * chant's name in Lora on the dark ground with its tradition under it. One
 * cover for every chant, so a row of them reads as one set, and never a
 * drawn ornament standing in for an icon (the owner's notes on the generic
 * AI look, 2026-10-16). No colour is washed out of the icon around it.
 */
export function ChantCover({
  cover,
  title,
  tradition,
  size,
  className,
}: {
  cover?: { src: string; alt: string };
  /** The chant's name in the reader's language, for the plate. */
  title: string;
  /** The tradition's name, under the title on the plate. */
  tradition?: string;
  /** The plate's lettering: large on a hero, small in a row. */
  size: "hero" | "card" | "thumb";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const mounted = useMounted();
  const box = cn("relative aspect-square overflow-hidden bg-night-soft ring-1 ring-inset ring-paper/10", className);
  // A streamed cover's address is the website's in the apps and the page's
  // own on the web, which only the device knows: it is drawn once mounted,
  // so the page's first markup (the plate) is the same everywhere.
  const ready = cover && (!isStreamed(cover.src) || mounted);

  if (cover && ready && !failed) {
    return (
      <div className={box}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are. */}
        <img
          src={chantMediaUrl(cover.src)}
          alt={cover.alt}
          loading={size === "hero" ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-[50%_20%]"
        />
      </div>
    );
  }

  // The plate. Its words are the cover's, so it is hidden from assistive
  // technology: the title is read where it is written beside it.
  return (
    <div aria-hidden className={cn(box, "flex flex-col justify-end", size === "thumb" ? "p-1.5" : size === "card" ? "p-3" : "p-5")}>
      {size === "thumb" ? null : (
        <>
          <span
            className={cn(
              "font-serif font-bold leading-tight text-paper/90",
              size === "hero" ? "text-title-sm" : "text-ui",
            )}
          >
            {title}
          </span>
          {tradition ? (
            <span className={cn("mt-1 font-sans text-paper/50", size === "hero" ? "text-detail" : "text-caption")}>
              {tradition}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}
