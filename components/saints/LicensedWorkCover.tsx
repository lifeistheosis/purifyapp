"use client";

import { useState } from "react";

/**
 * Cover image for a licensed work, with a graceful fallback.
 *
 * Amazon serves covers from `m.media-amazon.com/images/P/{ASIN}.jpg`, but
 * when it has no image for an ASIN it returns an HTTP 200 **1×1 transparent
 * GIF** rather than a 404 — so `onError` never fires and the box renders
 * empty. We catch both cases: a true network/`onError` failure, and a
 * "loaded" image whose `naturalWidth` is too small to be a real cover. In
 * either case we swap in a typographic tile (title + author) so the grid
 * never shows a blank rectangle.
 */
export function LicensedWorkCover({
  src,
  title,
  author,
}: {
  /** null when there is no rights-cleared image to show, which is the case
   * for every Amazon cover while no associate tag is configured. */
  src: string | null;
  title: string;
  author: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-2 px-4 py-5 text-center bg-gradient-to-b from-night to-[#0f0c12]">
        <span
          aria-hidden
          className="font-serif text-display-sm text-gold/30 leading-none"
        >
          †
        </span>
        <span className="font-serif text-detail text-paper/85 leading-snug line-clamp-4">
          {title}
        </span>
        <span className="font-sans text-caption uppercase tracking-[1.2px] text-paper/40 line-clamp-2">
          {author}
        </span>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={`Cover of ${title}`}
      loading="lazy"
      onError={() => setFailed(true)}
      onLoad={(e) => {
        // Amazon's "no image" placeholder is a 1×1 GIF served with 200 OK.
        if (e.currentTarget.naturalWidth <= 1) setFailed(true);
      }}
      className="h-full w-full object-cover group-hover:opacity-90 transition-opacity duration-200"
    />
  );
}
