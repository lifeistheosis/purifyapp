"use client";

import Image from "next/image";
import type { Saint } from "@/lib/saints/saints";
import { FacePlate, type CrossPlateSize } from "@/components/ui/CrossPlate";
import { cn } from "@/lib/cn";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";
import { PictureCreditNote } from "./PictureCredit";

// Renders a saint's icon as a small panel in the icons' own shape, three wide
// by four tall.
//
// The house's plate (components/ui/CrossPlate.tsx, its lit cross) always
// stands in the panel. When `iconUrl` is set, the real JPG layers on top, so
// while the file is loading the reader sees the plate, not empty space; a
// saint with no cleared picture is the plate. Until 1.9 the panel was a frame
// with an empty halo and his initials, which read as a picture that failed to
// load (build 93 note 1, the owner: "you could clearly see that his photo
// isn't loaded"; never an empty circle, never a letter). The JPG waits unseen
// until it has loaded and decoded, then fades in over the plate, whole (build
// 85, note 52; lib/ui/useArrivingImage.ts): a progressive JPEG painting
// itself blurry-to-sharp, band by band, is the "piece by piece" the owner
// keeps sending back.

type Size = "sm" | "md" | "lg";

const dims: Record<Size, { w: number; h: number; plate: CrossPlateSize }> = {
 sm: { w: 72, h: 96, plate: "thumb" },
 md: { w: 96, h: 128, plate: "card" },
 lg: { w: 160, h: 216, plate: "card" },
};

export function SaintIcon({
 saint,
 size = "md",
 priority = false,
 className,
}: {
 /** Only the name and the icon are read, so a profile or a saint in brief. */
 saint: Pick<Saint, "name" | "iconUrl">;
 size?: Size;
 /**
 * Mark the image as high-priority (hero use). Triggers Next.js preload and
 * fetchpriority=high so the file lands quickly. Default false; only the
 * lg/hero usage should set this true so we don't ship a wall of preloads.
 */
 priority?: boolean;
 className?: string;
}) {
 const d = dims[size];
 const { ref, onArrive } = useArrivingImage(saint.iconUrl ?? null);

 return (
 <>
 <div
 className={cn(
 // A dark island, as the icon itself is, on every palette (the owner, 1.8).
 "dark-island shrink-0 relative rounded-md overflow-hidden border border-paper/20 shadow-md",
 className,
 )}
 style={{ width: d.w, height: d.h }}
 aria-label={`Icon of ${saint.name}`}
 role="img"
 // In a card that opens the saint's page, the icon travels to the head of
 // it, found by the icon's own address (lib/ui/routeMotion.ts, 1.9).
 data-carry={saint.iconUrl || undefined}
 >
 {/* The house's plate, always underneath: what a saint with no cleared
 picture shows, and what stands while his picture comes. */}
 <FacePlate size={d.plate} />

 {/* Real icon overlays the plate, once it is whole. */}
 {saint.iconUrl && (
 <Image
 key={saint.iconUrl}
 ref={ref}
 src={saint.iconUrl}
 alt={`Icon of ${saint.name}`}
 fill
 sizes={`${d.w}px`}
 priority={priority}
 onLoad={onArrive}
 // object-top keeps the face in frame for tall full-body portraits
 // (Wikimedia icons are typically 1:3 bust/full-body crops where
 // the face sits in the top third).
 className="img-arrive object-cover object-top relative z-10"
 />
 )}
 </div>
 {/* A picture whose licence asks its maker be named says so to a screen reader (2026-11-11). */}
 <PictureCreditNote src={saint.iconUrl} />
 </>
 );
}
