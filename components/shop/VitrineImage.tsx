"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * A piece's photograph, brought in when it has arrived.
 *
 * The shop's pictures come from storage, after the page: filmed on
 * 2026-10-05, each one popped into its lit vitrine on its own, seconds apart,
 * which is most of what made the shop read as "loading in a weird way". The
 * vitrine holds the place (it always did); the photograph now fades into it
 * over a quarter of a second once it is there.
 *
 * It is never left invisible. The fade is started by the image's own load
 * event, by its error, or after two and a half seconds whatever has happened,
 * so a missed event costs a late photograph and not a missing one.
 *
 * The fade is a keyframe (`.vitrine-in`, app/globals.css) and not a
 * transition: the cards already put a slower transition on the same element
 * for their hover, and one element has one transition duration.
 */
export function VitrineImage({ className, onLoad, onError, alt, ...props }: ImageProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), 2500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <Image
      {...props}
      alt={alt}
      onLoad={(e) => {
        setShown(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        setShown(true);
        onError?.(e);
      }}
      className={cn(className, shown ? "vitrine-in" : "opacity-0")}
    />
  );
}
