"use client";

import { CrossPlate } from "@/components/ui/CrossPlate";
import { cn } from "@/lib/cn";
import { iconFace } from "@/lib/saints/iconFaces";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

/**
 * A request's saint, by his own icon from the app (r3-19, Requests A, "The
 * saint's icon", the owner's pick of 2026-10-31): a request is a saint
 * someone is praying with, so his icon is the first thing seen. Only an icon
 * whose rights are settled is ever given here (lib/shop/requestSaint.ts);
 * anything else, and a subject that is no saint (the Synaxis of the
 * Archangels), stands as the plate with the lit cross. Never a stand-in face.
 *
 * Cut by its face's own point (lib/saints/iconFaces.ts), never through the
 * face. It arrives whole (lib/ui/useArrivingImage.ts, note 52's rule).
 * Decoration beside the saint's written name.
 */
export function RequestIcon({
  src,
  width,
  height,
  className,
}: {
  src: string | null;
  width: number;
  height: number;
  /** Its corners. */
  className?: string;
}) {
  if (!src) return <CrossPlate size="thumb" className={cn("shrink-0", className)} style={{ width, height }} />;
  return (
    <span
      aria-hidden
      className={cn(
        "relative block shrink-0 overflow-hidden bg-night-soft shadow-[0_10px_18px_-10px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-paper/10",
        className,
      )}
      style={{ width, height }}
    >
      <IconPicture key={src} src={src} />
    </span>
  );
}

function IconPicture({ src }: { src: string }) {
  const { ref, onArrive } = useArrivingImage(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- the app's own icon, bundled; a static export serves it as it is.
    <img
      ref={ref}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onLoad={onArrive}
      className="img-arrive absolute inset-0 h-full w-full object-cover"
      style={{ objectPosition: `50% ${iconFace(src)}%` }}
    />
  );
}
