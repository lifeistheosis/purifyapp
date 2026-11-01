"use client";

import Image from "next/image";
import { getPrayerIcon } from "@/lib/prayers/icons";
import { cn } from "@/lib/cn";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

/**
 * Renders a Byzantine theme icon inside an Orthodox-frame chrome:
 * outer warm-brown border, inner gold frame, the icon photo behind.
 * Same visual vocabulary as SaintIcon, scaled for prayer-section use.
 * The icon comes in whole over its ground, never a band at a time (build
 * 85, note 52; lib/ui/useArrivingImage.ts).
 *
 * Sizes:
 * sm 72 × 96 , thumbnail (Hours grid card top)
 * md 120 × 160 , section anchor (rule cards, Akathists)
 * lg 200 × 280 , Jesus Prayer card centerpiece
 * hero fills container with object-cover, used as a backdrop
 */

type Size = "sm" | "md" | "lg" | "hero";

const dims: Record<Exclude<Size, "hero">, { w: number; h: number }> = {
 sm: { w: 72, h: 96 },
 md: { w: 120, h: 160 },
 lg: { w: 200, h: 280 },
};

export function PrayerIcon({
 slug,
 size = "md",
 priority = false,
 className,
}: {
 slug: string;
 size?: Size;
 /** Set on the page's primary icon so Next preloads it. */
 priority?: boolean;
 className?: string;
}) {
 const icon = getPrayerIcon(slug);
 const { ref, onArrive } = useArrivingImage(icon?.src ?? null);
 if (!icon) return null;

 if (size === "hero") {
 return (
 <div className={cn("absolute inset-0", className)} aria-hidden>
 <Image
 key={icon.src}
 ref={ref}
 src={icon.src}
 alt={icon.alt}
 fill
 priority={priority}
 sizes="100vw"
 onLoad={onArrive}
 className="img-arrive object-cover object-top"
 />
 </div>
 );
 }

 const d = dims[size];
 return (
 <div
 className={cn(
 "shrink-0 relative rounded-md overflow-hidden border border-paper/20 shadow-md bg-[#1a1219]",
 className,
 )}
 style={{ width: d.w, height: d.h }}
 role="img"
 aria-label={icon.alt}
 >
 {/* Inner silver frame, the Orthodox icon-panel cue (gold until 1.8). */}
 <div
 aria-hidden
 className="absolute inset-1 rounded-sm border border-gold/40 pointer-events-none z-10"
 />
 <Image
 key={icon.src}
 ref={ref}
 src={icon.src}
 alt={icon.alt}
 fill
 priority={priority}
 sizes={`${d.w}px`}
 onLoad={onArrive}
 className="img-arrive object-cover object-top"
 />
 </div>
 );
}
