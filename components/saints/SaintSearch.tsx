"use client";

import { SearchDoor } from "@/components/search/SearchField";

/**
 * The Saints' search field: the door to the one search, turned to the Saints
 * (1.8, the owner's pick of r3-12, "C, with the mix of B").
 *
 * It was a dropdown of its own over the saints and their works. The one
 * search finds both behind the Saints' door, with the two as its strip
 * (Saints, Writings), the saints by their faces (lib/search/engine.ts,
 * inDoor and kindIn).
 */
export function SaintSearch({ className }: { className?: string }) {
  return <SearchDoor place="saints" placeholderKey="settings.discordFavoriteSearch" className={className} />;
}
