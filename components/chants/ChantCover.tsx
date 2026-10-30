"use client";

import { useState } from "react";

import { CrossPlate } from "@/components/ui/CrossPlate";
import { chantMediaUrl, isStreamed } from "@/lib/chants/media";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/useMounted";

/**
 * A chant's cover (1.7): its public-domain icon, square, or with no picture
 * (or none reachable: a streamed cover with no signal) the plate. One cover
 * for every chant, so a row of them reads as one set, and never a drawn
 * ornament or a made picture standing in for an icon (the owner's notes on
 * the generic AI look, 2026-10-16). No colour is washed out of the icon.
 *
 * 1.8: the plate is the dark ground with the three-bar cross glowing white,
 * and on a hero or a card the chant's languages under it, in their own
 * scripts (components/ui/CrossPlate.tsx). Until then it was the chant's name
 * on the bare ground, and a thumb was an empty square; the coordinator's walk
 * of 2026-10-30 found the Chants home opening on a blank grey box. The name
 * is written beside or under every cover, so the plate does not repeat it.
 */
export function ChantCover({
  cover,
  languages,
  size,
  className,
}: {
  cover?: { src: string; alt: string };
  /** The versions' names in their own scripts ("English", "العربية"), for the plate. */
  languages?: string[];
  /** The plate's lettering: large on a hero, small on a card, none on a thumb. */
  size: "hero" | "card" | "thumb";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const mounted = useMounted();
  const box = cn("relative aspect-square overflow-hidden", className);
  // A streamed cover's address is the website's in the apps and the page's
  // own on the web, which only the device knows: it is drawn once mounted,
  // so the page's first markup (the plate) is the same everywhere.
  const ready = cover && (!isStreamed(cover.src) || mounted);

  if (cover && ready && !failed) {
    return (
      <div data-cover="img" className={cn(box, "bg-night-soft ring-1 ring-inset ring-paper/10")}>
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

  return <CrossPlate size={size} caption={languages?.length ? languages.join(" · ") : undefined} className={box} />;
}

/** A chant's versions' names, each once, in the chant's order: the plate's line. */
export function languagesOf(variants: { label: string }[]): string[] {
  return [...new Set(variants.map((v) => v.label))];
}
