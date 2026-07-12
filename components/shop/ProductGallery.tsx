"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import type { ShopProductMedia } from "@/lib/shop/types";
import { cn } from "@/lib/cn";

/**
 * Product image gallery: native horizontal scroll-snap (swipeable with
 * a thumb, wheel, or keyboard scrolling) with dot indicators. No
 * autoplay — a buyer is inspecting merchandise, not watching a slideshow.
 */
export function ProductGallery({
  media,
  representative,
}: {
  media: ShopProductMedia[];
  representative: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  if (media.length === 0) {
    return (
      <div
        aria-hidden
        className="flex aspect-square items-center justify-center rounded-lg border border-paper/10 bg-paper/[0.04] font-display-serif text-display text-paper/15"
      >
        ☩
      </div>
    );
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== idx) setIdx(Math.max(0, Math.min(media.length - 1, i)));
  }

  function goTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  }

  return (
    <figure className="relative">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-xl border border-paper/8 bg-gradient-to-b from-paper/[0.05] to-paper/[0.02] scrollbar-thin"
        aria-label="Product images"
      >
        {media.map((m, i) => (
          <div
            key={m.id}
            className="relative aspect-square w-full shrink-0 snap-center overflow-hidden"
          >
            <Image
              src={m.media_url}
              alt={m.alt_text}
              fill
              priority={i === 0}
              sizes="(min-width: 768px) 560px, 100vw"
              className="object-contain p-6"
            />
          </div>
        ))}
      </div>

      {media.length > 1 ? (
        <>
          {/* Thumbnail strip: the primary gallery control on md+; dots stay
              for phones where thumbnails would crowd the frame. */}
          <div className="mt-3 hidden gap-2.5 md:flex">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show image ${i + 1} of ${media.length}`}
                aria-current={i === idx}
                className={cn(
                  "relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg border transition-colors",
                  i === idx
                    ? "border-gold"
                    : "border-paper/12 hover:border-paper/35",
                )}
              >
                <Image
                  src={m.media_url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain p-1.5"
                />
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Image ${i + 1} of ${media.length}`}
                aria-current={i === idx}
                className={cn(
                  "h-2.5 w-2.5 rounded-full border border-paper/40 transition-colors",
                  i === idx ? "bg-paper" : "bg-transparent hover:bg-paper/40",
                )}
              />
            ))}
          </div>
        </>
      ) : null}

      {representative ? (
        <figcaption className="mt-3 text-center font-sans text-caption text-paper/60">
          Representative image: your icon is the same design and format;
          natural wood and print variation may differ slightly.
        </figcaption>
      ) : null}
    </figure>
  );
}
