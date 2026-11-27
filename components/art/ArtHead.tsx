"use client";

// The head of a place's own page in Silver Night (2.0; docs/brand/art/IMPLEMENT.md,
// sections 1 and 4): the place's one picture at 16:9, which the place's Discover
// door carries into it (data-carry-into, lib/ui/routeMotion.ts), with its mist
// drifting slowly at a steady speed (.art-drift, app/globals.css; still under
// data-motion="reduce"). Where Silver Night is off, the page's own head stands.

import type { ReactNode } from "react";
import { ART, carryKey, type PlaceKey } from "@/lib/art/art";
import { useArt } from "@/lib/art/useArt";

export function ArtHead({ place, fallback = null, focus = "50% 45%" }: { place: PlaceKey; fallback?: ReactNode; focus?: string }) {
  if (!useArt()) return <>{fallback}</>;
  const art = ART[place];
  return (
    <figure data-art-head={place} className="dark-island art-drift relative mb-7 w-full overflow-hidden rounded-[22px] bg-night-soft">
      <span data-carry-into={carryKey(place)} className="relative block aspect-[16/9] w-full overflow-hidden">
        <picture>
          <source type="image/avif" srcSet={art.avif} />
          <img src={art.webp} alt={art.alt} width={art.width} height={art.height} decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: focus }} />
        </picture>
      </span>
    </figure>
  );
}
