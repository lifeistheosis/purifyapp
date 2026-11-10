"use client";

import Image from "next/image";

import { cn } from "@/lib/cn";
import { saintInitials } from "@/lib/saints/initials";
import type { ShopSaint } from "@/lib/shop/bySaint";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

/**
 * A saint's icon in a circle, for "Shop by saint" (lib/shop/bySaint.ts): the
 * library's own picture of him, cut round with his face held near the top
 * (object position 50% 20%, as the design drew it), or his initials when the
 * library has no picture. The size is the caller's (`className`), so the
 * shop home's row and a saint's shop page share one drawing.
 *
 * The picture arrives whole (build 85, note 52): the round ground stands in
 * its place until it has loaded and decoded, and then it fades in, never a
 * band at a time (lib/ui/useArrivingImage.ts). The caller's own motion (a
 * hover's zoom) moves the frame the picture sits in, so the two never share
 * one transition.
 *
 * The picture is decoration beside his written name, so it says nothing to
 * a screen reader.
 */
export function SaintAvatar({
  saint,
  sizes,
  className,
  imageClassName,
}: {
  saint: Pick<ShopSaint, "shortName" | "iconUrl">;
  /** The rendered width, for the image's `sizes`. */
  sizes: string;
  className?: string;
  /** Extra classes on the picture's frame (a hover, a transition). */
  imageClassName?: string;
}) {
  const { ref, onArrive } = useArrivingImage(saint.iconUrl ?? null);
  const initials = saintInitials(saint.shortName);
  return (
    <span
      aria-hidden
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full bg-night-soft ring-1 ring-inset ring-paper/[0.08]",
        className,
      )}
    >
      {saint.iconUrl ? (
        <span className={cn("absolute inset-0 block", imageClassName)}>
          <Image
            key={saint.iconUrl}
            ref={ref}
            src={saint.iconUrl}
            alt=""
            fill
            sizes={sizes}
            onLoad={onArrive}
            className="img-arrive object-cover object-[50%_20%]"
          />
        </span>
      ) : (
        <span className="flex h-full w-full items-center justify-center font-heading font-semibold text-paper/60">
          {initials}
        </span>
      )}
    </span>
  );
}
