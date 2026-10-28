import Image from "next/image";

import { cn } from "@/lib/cn";
import type { ShopSaint } from "@/lib/shop/bySaint";

/**
 * A saint's icon in a circle, for "Shop by saint" (lib/shop/bySaint.ts): the
 * library's own picture of him, cut round with his face held near the top
 * (object position 50% 20%, as the design drew it), or his initials when the
 * library has no picture. The size is the caller's (`className`), so the
 * shop home's row and a saint's shop page share one drawing.
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
  /** Extra classes on the picture itself (a hover, a transition). */
  imageClassName?: string;
}) {
  const initials = saint.shortName
    .split(/\s+/)
    .filter((w) => /^\p{Lu}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full bg-night-soft ring-1 ring-inset ring-paper/[0.08]",
        className,
      )}
    >
      {saint.iconUrl ? (
        <Image
          src={saint.iconUrl}
          alt=""
          fill
          sizes={sizes}
          className={cn("object-cover object-[50%_20%]", imageClassName)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-heading font-semibold text-paper/60">
          {initials}
        </span>
      )}
    </span>
  );
}
