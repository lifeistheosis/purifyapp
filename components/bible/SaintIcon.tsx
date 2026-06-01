"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { authorIcon } from "@/lib/saints/icons";

const FILLER = new Set([
  "the",
  "of",
  "and",
  "a",
  "an",
  "to",
  "in",
  "st",
  "st.",
  "saint",
  "pope",
]);

function initialsOf(author: string): string {
  const parts = author
    .replace(/[.,]/g, "")
    .split(/\s+/)
    .filter((p) => p && !FILLER.has(p.toLowerCase()));
  if (parts.length === 0) return "?";
  const letters = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
  return letters.join("");
}

// One dignified monochrome treatment for every initials fallback. A
// per-author rotating tint read as a "generated avatar" and undercut the
// iconography; a single quiet paper-on-dark chip sits closer to a framed
// icon placeholder than a social-app avatar.
const FALLBACK_TINT = "bg-paper/[0.06] text-paper/70";

type Size = "sm" | "md";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-7 w-7 text-eyebrow",
  md: "h-10 w-10 text-detail",
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
  // Check explicitly after mount; if the img is broken, swap to initials.
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

  if (src && !failed) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        ref={imgRef}
        src={src}
        alt={author}
        onError={() => setFailed(true)}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth === 0) setFailed(true);
        }}
        className={cn(
          "rounded-full object-cover object-top bg-paper/5 ring-1 ring-paper/15 shrink-0",
          sizeCls,
          className,
        )}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={author}
      title={author}
      className={cn(
        "rounded-full flex items-center justify-center shrink-0 font-sans font-semibold tracking-[0.5px] ring-1 ring-paper/15",
        FALLBACK_TINT,
        sizeCls,
        className,
      )}
    >
      {initialsOf(author)}
    </span>
  );
}
