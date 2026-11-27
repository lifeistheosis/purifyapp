"use client";

// Discover's doors: the tiles of Silver Night where it is on (lib/art/useArt.ts),
// the gallery's bands everywhere else, as readers have them today.

import type { ReactNode } from "react";
import { useArt } from "@/lib/art/useArt";
import { ArtTiles, type TileDoor } from "./ArtTiles";

export function DiscoverDoors({ bands, doors }: { bands: ReactNode; doors: TileDoor[] }) {
  return useArt() ? <ArtTiles doors={doors} /> : <>{bands}</>;
}
