import { cn } from "@/lib/cn";
import { serviceArt } from "@/lib/prayers/serviceArt";

/**
 * A prayer page's icon on its dark plate (1.7): the cover system of the
 * owner's pattern 6 ("a real icon on a dark plate"), in the shape an icon
 * is painted, three wide by four tall.
 *
 * The icons are the app's own (about 550 by 800 pixels), so the largest
 * plate here, 120 by 160, is never drawn past their pixels on a phone. The
 * head of every icon is at its top, which is where the crop keeps.
 *
 * The plate is decoration beside the page's own words, so it is hidden from
 * assistive technology: the title is read where it is written.
 */
export type ArtSize = "sm" | "md";

const BOX: Record<ArtSize, string> = {
  sm: "w-12 rounded-[8px]",
  md: "w-[120px] rounded-[14px]",
};

export function ArtPlate({ id, size, className }: { id: string; size: ArtSize; className?: string }) {
  const art = serviceArt(id);
  return (
    <span
      aria-hidden
      className={cn("relative block aspect-[3/4] shrink-0 overflow-hidden bg-night-soft", BOX[size], className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are. */}
      <img
        src={art.src}
        alt=""
        loading={size === "sm" ? "lazy" : "eager"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-paper/10" />
    </span>
  );
}
