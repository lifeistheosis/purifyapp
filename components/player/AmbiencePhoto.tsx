"use client";

import { AMBIENCE_PHOTO_SIZE, type AmbienceTrack } from "@/lib/ambience/ambience";
import { cn } from "@/lib/cn";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

/**
 * A sound's photograph at the top of its tile (build 95, note 22), melting
 * into the tile's own ground by a mask (app/globals.css
 * .ambience-tile-picture), so the name below reads on every palette and no
 * bright line shows at the round corners. The photograph is the sound's own,
 * bundled beside it (lib/ambience/ambience.ts, `photo`), and arrives whole
 * over its own colour (lib/ui/useArrivingImage.ts). It fills what the tile
 * leaves above the name, so the tile's size never changes when it paints.
 *
 * One drawing for both places a sound is chosen: the ambience sheet's tiles
 * (components/player/AmbienceSheet.tsx) and the Plus preview's strip
 * (components/billing/plusTry/TryAmbience.tsx), which took the photographs at
 * his word of 2026-11-13 about 14:29 UTC. `className` sets it to its tile's
 * padding: the picture runs to the tile's edges.
 */
export function AmbiencePhoto({ track, className }: { track: AmbienceTrack; className: string }) {
  const { ref, onArrive } = useArrivingImage(track.photo.src);
  return (
    <span
      aria-hidden
      className={cn("ambience-tile-picture relative block min-h-0 flex-1", className)}
      style={{ backgroundColor: track.photo.ground }}
      data-mock-allow="palette"
      data-mock-why="the photograph's own colour, under it until it paints: a picture does not follow the palette, and it melts into the tile's ground, which does"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves the bundled file as it is. */}
      <img
        ref={ref}
        src={track.photo.src}
        alt=""
        width={AMBIENCE_PHOTO_SIZE.width}
        height={AMBIENCE_PHOTO_SIZE.height}
        decoding="async"
        onLoad={onArrive}
        className="img-arrive absolute inset-0 h-full w-full object-cover"
      />
    </span>
  );
}
