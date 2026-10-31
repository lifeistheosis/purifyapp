"use client";

import type { ImgHTMLAttributes, SyntheticEvent } from "react";

import { cn } from "@/lib/cn";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

/**
 * An <img> that arrives whole: unseen until every byte is in and it is
 * decoded, then faded in on the app's motion switch, never a band at a time
 * (lib/ui/useArrivingImage.ts, the rule; build 85, note 52). For a picture
 * drawn plainly, and from a server component too, which cannot hold the hook
 * itself; a picture with its own fallbacks takes the hook directly.
 *
 * Its box is the caller's: a picture that arrives into a box of its own size
 * moves nothing around it. A new address is a new element, looked at afresh.
 */
export function ArrivingImage({
  src,
  alt = "",
  className,
  onLoad,
  onBroken,
  ...rest
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  /** A picture that failed before the page could listen; onError hears the rest. */
  onBroken?: (img: HTMLImageElement) => void;
}) {
  const { ref, onArrive } = useArrivingImage(src, onBroken);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are.
    <img
      {...rest}
      key={src}
      ref={ref}
      src={src}
      alt={alt}
      onLoad={(e: SyntheticEvent<HTMLImageElement>) => {
        onArrive(e);
        onLoad?.(e);
      }}
      className={cn("img-arrive", className)}
    />
  );
}
