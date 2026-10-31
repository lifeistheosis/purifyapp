import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * A subject's icon whole, in its own light (1.8, round 3 r3-13): B's images
 * in the owner's hybrid of B and C, "the whole icon in its own light, never
 * cropped". The icon stands at its own proportions in the middle of its
 * frame, and the same icon, blurred and grey, fills the frame behind it
 * (globals.css, .whole-icon). The frame's size is the caller's. Decoration:
 * the subject's name beside it says what it is.
 */
export function WholeIcon({
  src,
  className,
  eager = false,
  children,
}: {
  src: string;
  className?: string;
  /** On the first screen: asked for at once, not when scrolled to. */
  eager?: boolean;
  children?: ReactNode;
}) {
  return (
    <span className={cn("whole-icon relative block overflow-hidden", className)}>
      <span aria-hidden className="whole-icon-light" style={{ backgroundImage: `url(${src})` }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are. */}
      <img src={src} alt="" aria-hidden loading={eager ? "eager" : "lazy"} decoding="async" className="whole-icon-picture" />
      {children}
    </span>
  );
}
