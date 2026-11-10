"use client";

import Image from "next/image";
import type { Saint } from "@/lib/saints/saints";
import { cn } from "@/lib/cn";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

// Renders a saint's icon as a small framed panel reminiscent of an Orthodox
// icon: a dark ground, a silver inner frame, halo, initials. The ground was a
// brown to olive-gold wood and the frame gold until 1.8: the owner read that
// gradient as yellow (2026-09-25) and wants no gold in the app (2026-10-28,
// refinement 2), so the panel is in the house greys, as dark as it was.
//
// The gradient + frame + halo + initials always render as an instant
// CSS placeholder. When `iconUrl` is set, the real JPG layers on top, so
// while the file is loading, the user sees a stylized frame in place of empty
// space. The JPG waits unseen until it has loaded and decoded, then fades in
// over the frame, whole (build 85, note 52; lib/ui/useArrivingImage.ts): a
// progressive JPEG painting itself blurry-to-sharp, band by band, is the
// "piece by piece" the owner keeps sending back.

type Size = "sm" | "md" | "lg";

const dims: Record<Size, { w: number; h: number; halo: number; text: number }> = {
 sm: { w: 72, h: 96, halo: 28, text: 16 },
 md: { w: 96, h: 128, halo: 40, text: 22 },
 lg: { w: 160, h: 216, halo: 68, text: 36 },
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

 const initials = saint.name
 .replace(/^St\.?\s+/i, "")
 .split(/\s+/)
 .slice(0, 2)
 .map((w) => w[0])
 .join("");

 return (
 <div
 className={cn(
 "shrink-0 relative rounded-md overflow-hidden border border-paper/20 shadow-md",
 className,
 )}
 style={{
 width: d.w,
 height: d.h,
 background:
 "linear-gradient(180deg, #212124 0%, #2d2d31 38%, #45454b 100%)",
 }}
 aria-label={`Icon of ${saint.name}`}
 role="img"
 // In a card that opens the saint's page, the icon travels to the head of
 // it, found by the icon's own address (lib/ui/routeMotion.ts, 1.9).
 data-carry={saint.iconUrl || undefined}
 >
 {/* Placeholder layer, always present underneath. Silver inner frame +
 halo + initials are pure CSS, so something stylized renders before
 the JPG arrives. */}
 <div
 aria-hidden
 className="absolute inset-1 rounded-sm border border-gold/60 flex flex-col items-center justify-center pointer-events-none"
 >
 <div
 className="rounded-full border-2 border-gold"
 style={{
 width: d.halo,
 height: d.halo,
 background:
 "radial-gradient(circle, rgba(183,176,163,0.35) 0%, rgba(183,176,163,0) 75%)",
 boxShadow: "0 0 12px rgba(183,176,163,0.35)",
 }}
 />
 <span
 className="font-serif text-cream mt-2 tracking-[0.05em]"
 style={{ fontSize: d.text, lineHeight: 1 }}
 >
 {initials}
 </span>
 </div>

 {/* Real icon overlays the placeholder, once it is whole. */}
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
 );
}
