"use client";

import { useEffect, useRef, useState } from "react";
import { FacePlate } from "@/components/ui/CrossPlate";
import { cn } from "@/lib/cn";
import { authorIcon } from "@/lib/saints/icons";

// An author with no cleared picture, or whose picture cannot load, is the
// house's plate and its lit cross (components/ui/CrossPlate.tsx), never his
// initials and never an empty round (1.9, build 93 note 1). The initials
// chip it replaced was itself a step away from a per-author rotating tint,
// which read as a "generated avatar"; the plate is the house's own.

type Size = "sm" | "md";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-7 w-7",
  md: "h-10 w-10",
};

export function SaintIcon({
  author,
  size = "sm",
  className,
}: {
  author: string;
  size?: Size;
  className?: string;
}) {
  const src = authorIcon(author);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sizeCls = SIZE_CLASSES[size];

  // Some servers return 404 with HTML body. Chromium reports the img as
  // "complete" with naturalWidth 0 and may fire neither onload nor onerror.
  // Check explicitly after mount; if the img is broken, the plate stays.
  useEffect(() => {
    if (!src || failed) return;
    const id = window.setTimeout(() => {
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth === 0) {
        setFailed(true);
      }
    }, 200);
    return () => window.clearTimeout(id);
  }, [src, failed]);

  return (
    <span
      role="img"
      aria-label={author}
      title={author}
      className={cn("relative block shrink-0 overflow-hidden rounded-full ring-1 ring-paper/15", sizeCls, className)}
    >
      {/* The plate stands at once; his picture, where there is one, comes over it. */}
      <FacePlate size="disc" />
      {src && !failed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={imgRef}
          src={src}
          alt=""
          onError={() => setFailed(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth === 0) setFailed(true);
          }}
          className="absolute inset-0 size-full object-cover object-top"
        />
      ) : null}
    </span>
  );
}
