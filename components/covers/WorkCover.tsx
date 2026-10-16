"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * One cover for every book (1.7, the owner's pattern 6 of 2026-10-16: "one
 * cover system, a real icon on a dark plate, the title in Lora"), shared by
 * the reading room (note 18), a saint's Writings (note 19) and the walks.
 * Every cover looks related and real, and none is drawn art.
 *
 * THE PLATE is dark on every palette, as a bound book is (`dark-island`
 * puts the dark palette's words back inside it on Light). The author's icon
 * sits in a window at its top, inset from the plate's edge and rounded a
 * little less than the plate, cut to show his face (`focusY`, where the face
 * is, from the top); under it the title in Lora and the author in small
 * type. Nothing is laid over the icon: no wash, no gradient, no frame.
 *
 * A book with no settled picture of its saint (lib/reading/coverArt.ts) is
 * the plate with its title alone, set larger and from the top, the author
 * under it: no halo, no initials, no ornament in the icon's place, so it
 * still reads as one of the set. A picture the apps ask of the website and
 * cannot get (no signal) falls back to the same plate.
 *
 * A book in print may have its real cover (`imageUrl`). Amazon answers a
 * missing cover with a 1 by 1 picture and a 200, so a picture that loads at
 * one pixel is treated as missing, as is one that fails: the plate is shown.
 * A picture already failed when the page wakes is caught too (as
 * components/saints/SaintHeroPicture.tsx does): the server wrote the <img>,
 * and a phone with no signal answers it before React is awake.
 *
 * The cover's words are the link's, so the cover is hidden from assistive
 * technology: a row names its link with the title and the author.
 */
export type CoverSize = "sm" | "md" | "lg" | "row" | "grid" | "hero";

const WIDTH: Record<CoverSize, string> = {
  sm: "w-[72px]",
  md: "w-[120px]",
  lg: "w-[160px]",
  row: "w-[112px] md:w-[148px]",
  grid: "w-full",
  hero: "w-[188px] md:w-[220px]",
};

/** Three scales of type and spacing: a thumbnail, a shelf, a book held up. */
type Scale = "tiny" | "shelf" | "large";
const SCALE: Record<CoverSize, Scale> = { sm: "tiny", md: "shelf", row: "shelf", grid: "shelf", lg: "large", hero: "large" };

const PLATE: Record<Scale, string> = {
  tiny: "rounded-[6px]",
  shelf: "rounded-[10px]",
  large: "rounded-[12px]",
};
const WINDOW: Record<Scale, string> = {
  tiny: "mx-[4px] mt-[4px] h-[56%] rounded-[4px]",
  shelf: "mx-[7px] mt-[7px] h-[52%] rounded-[7px] md:mx-[8px] md:mt-[8px]",
  large: "mx-[10px] mt-[10px] h-[58%] rounded-[9px]",
};
const WORDS: Record<Scale, string> = {
  tiny: "px-[6px] pb-[5px]",
  shelf: "px-[9px] pb-[8px] md:px-[11px] md:pb-[10px]",
  large: "px-[13px] pb-[12px]",
};
const TITLE: Record<Scale, string> = {
  tiny: "line-clamp-2 text-[10px] leading-[1.15]",
  shelf: "line-clamp-3 text-[13px] leading-[1.17] md:text-[15.5px]",
  large: "line-clamp-3 text-[18px] leading-[1.18] md:text-[20px]",
};
/** The title alone on the plate: larger, and it may take more lines. */
const TITLE_ALONE: Record<Scale, string> = {
  tiny: "line-clamp-4 text-[12px] leading-[1.15]",
  shelf: "line-clamp-5 text-[17px] leading-[1.15] md:text-[20px]",
  large: "line-clamp-5 text-[23px] leading-[1.12] md:text-[26px]",
};
const AUTHOR: Record<Scale, string> = {
  tiny: "hidden",
  shelf: "mt-1 text-[11px] leading-[1.3] md:text-[12px]",
  large: "mt-1.5 text-[12.5px] leading-[1.3]",
};

export function WorkCover({
  title,
  author,
  iconUrl,
  focusY = 22,
  imageUrl,
  size,
  priority = false,
  className,
}: {
  title: string;
  author?: string;
  /** The icon of the work's saint: a settled picture only (lib/reading/coverArt.ts). */
  iconUrl?: string | null;
  /** Where the face sits in the icon, percent from its top. */
  focusY?: number;
  /** The book's own cover, when there is one the site may show. */
  imageUrl?: string | null;
  size: CoverSize;
  /** The one cover a screen opens on: loaded at once, not when scrolled to. */
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const picture = useRef<HTMLImageElement>(null);
  const src = imageUrl || iconUrl || null;

  // A picture that failed (or came back at one pixel) before the page could
  // listen.
  useEffect(() => {
    const img = picture.current;
    if (img && img.complete && img.naturalWidth <= 1) setFailed(img.getAttribute("src"));
  }, [src]);

  const scale = SCALE[size];
  const box = cn(
    "dark-island relative aspect-[2/3] shrink-0 overflow-hidden bg-night-soft ring-1 ring-inset ring-paper/10",
    PLATE[scale],
    WIDTH[size],
    className,
  );
  const lost = failed !== null && failed === src;

  if (imageUrl && !lost) {
    return (
      <div aria-hidden data-cover="" className={box}>
        {/* eslint-disable-next-line @next/next/no-img-element -- another site's picture, shown as it is. */}
        <img
          ref={picture}
          src={imageUrl}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(imageUrl)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth <= 1) setFailed(imageUrl);
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  const icon = iconUrl && !lost ? iconUrl : null;
  return (
    <div aria-hidden data-cover="" className={cn(box, "flex flex-col")}>
      {icon ? (
        <div className={cn("relative shrink-0 overflow-hidden bg-night", WINDOW[scale])}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are. */}
          <img
            ref={picture}
            src={icon}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : undefined}
            onError={() => setFailed(icon)}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: `50% ${focusY}%` }}
          />
        </div>
      ) : null}
      <span
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          icon ? "justify-center" : "justify-start pt-[14%]",
          WORDS[scale],
          !icon && scale === "tiny" && "pt-[18%]",
        )}
      >
        <span className={cn("font-serif font-semibold text-paper/92", icon ? TITLE[scale] : TITLE_ALONE[scale])}>
          {title}
        </span>
        {author ? <span className={cn("line-clamp-1 font-sans text-paper/58", AUTHOR[scale])}>{author}</span> : null}
      </span>
    </div>
  );
}
