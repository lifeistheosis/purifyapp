"use client";

import { useState, type CSSProperties } from "react";

import { cn } from "@/lib/cn";

/**
 * The picture of what is playing (1.7): Now Playing's cover, its blurred
 * backdrop and its small cover over the captions, and the mini player's
 * thumb.
 *
 * A read-aloud cover is an icon of the book's saint or prophet, kept on the
 * website and not in the apps (lib/readAloud/covers.ts). An app with no
 * signal cannot load it, so on an error the picture becomes the fallback the
 * track named, the bundled manuscript plate, and the cover is never a broken
 * image. With no fallback, or if that fails too, it is an empty tile.
 */
export function CoverArt({
  src,
  fallback,
  size,
  className,
  style,
  decorative = true,
}: {
  src: string | null;
  fallback?: string | null;
  /** The drawn size in CSS px, for the width and height the page reserves. */
  size: number;
  className?: string;
  style?: CSSProperties;
  /** The title beside it names what is playing, so the picture is quiet. */
  decorative?: boolean;
}) {
  const [errors, setErrors] = useState<{ of: string | null; count: number }>({ of: src, count: 0 });
  const count = errors.of === src ? errors.count : 0;
  const shown = count === 0 ? src : count === 1 && fallback ? fallback : null;

  if (!shown) return <span aria-hidden className={cn("block bg-paper/10", className)} style={style} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are, and the cover may be another origin's.
    <img
      key={shown}
      src={shown}
      alt=""
      aria-hidden={decorative || undefined}
      width={size}
      height={size}
      decoding="async"
      onError={() => setErrors({ of: src, count: count + 1 })}
      className={cn("object-cover", className)}
      style={style}
    />
  );
}
