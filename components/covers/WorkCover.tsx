"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * One cover for every book (1.7, the owner's pattern 6 of 2026-10-16: "one
 * cover system, a real icon on a dark plate, the title in Lora"), shared by a
 * saint's Writings and, next, the reading room of note 18. Every cover looks
 * related and real, and none is drawn art.
 *
 * The plate: the author's icon cut square into its top, the title in Lora
 * under it, the author in small type on the larger sizes. The icons are the
 * ones the app carries (about 300 by 420 pixels), sharp at every size here,
 * the largest being 160 by 240. A work whose author has no icon has the
 * plate with its title alone, never a drawn ornament in the icon's place.
 *
 * A book in print may have its real cover (`imageUrl`). Amazon answers a
 * missing cover with a 1 by 1 picture and a 200, so a picture that loads at
 * one pixel is treated as missing, as is one that fails: the plate is shown.
 * A walkthrough's cover is the book's icon, which the website keeps and the
 * apps fetch (lib/walkthroughs/cover.ts): with no signal it fails, often
 * before the page can listen for it, so a picture already failed when the
 * page wakes is caught too (as components/saints/SaintHeroPicture.tsx does).
 *
 * The cover's words are the row's, so the cover is hidden from assistive
 * technology: the title is read where it is written beside it.
 */
export type CoverSize = "sm" | "md" | "lg";

const WIDTH: Record<CoverSize, string> = {
  sm: "w-[72px]",
  md: "w-[120px]",
  lg: "w-[160px]",
};

export function WorkCover({
  title,
  author,
  iconUrl,
  imageUrl,
  size,
  className,
}: {
  title: string;
  author?: string;
  /** The author's icon, from the app's own icons. */
  iconUrl?: string | null;
  /** The book's own cover, when there is one the site may show. */
  imageUrl?: string | null;
  size: CoverSize;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const picture = useRef<HTMLImageElement>(null);

  // A picture that failed (or came back at one pixel) before the page could
  // listen: the server wrote the <img>, and a phone with no signal answers it
  // before React is awake.
  useEffect(() => {
    const img = picture.current;
    if (img && img.complete && img.naturalWidth <= 1) setFailed(true);
  }, [imageUrl]);

  const box = cn(
    "relative aspect-[2/3] shrink-0 overflow-hidden rounded-[8px] bg-night-soft ring-1 ring-inset ring-paper/10",
    WIDTH[size],
    className,
  );

  if (imageUrl && !failed) {
    return (
      <div aria-hidden className={box}>
        {/* eslint-disable-next-line @next/next/no-img-element -- another site's picture, shown as it is. */}
        <img
          ref={picture}
          src={imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth <= 1) setFailed(true);
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div aria-hidden className={cn(box, "flex flex-col")}>
      {iconUrl ? (
        // The head is at the top of every icon the app carries, so the top
        // three fifths of the cover hold the face and the shoulders.
        // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are.
        <img
          src={iconUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-[60%] w-full shrink-0 object-cover object-top"
        />
      ) : null}
      <span
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          iconUrl ? "justify-center" : "justify-end",
          size === "sm" ? "px-1.5 py-1" : size === "md" ? "px-2.5 py-2" : "px-3 py-2.5",
        )}
      >
        <span
          className={cn(
            "font-serif font-bold leading-[1.15] text-paper/90",
            size === "sm" ? "line-clamp-2 text-[10px]" : size === "md" ? "line-clamp-2 text-detail" : "line-clamp-3 text-ui",
          )}
        >
          {title}
        </span>
        {author && size !== "sm" ? (
          <span className="mt-1 line-clamp-1 font-sans text-caption text-paper/50">{author}</span>
        ) : null}
      </span>
    </div>
  );
}
