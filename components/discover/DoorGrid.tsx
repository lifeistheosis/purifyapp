"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";

import { ArtTiles } from "@/components/art/ArtTiles";
import { GalleryBand } from "@/components/ui/GalleryBand";
import { useArt } from "@/lib/art/useArt";
import { readOrder, subscribeOrder } from "@/lib/discover/doorOrder";
import { TILE_PREVIEWS } from "@/lib/discover/tilePreviews.generated";

/** One door of the library on a computer: the phone's own (components/mobile/DiscoverMobile.tsx, discoverEntries). */
export type GridDoor = {
  href: string;
  title: ReactNode;
  line: ReactNode;
  picture: string;
  focus?: string;
  badge?: ReactNode;
};

/**
 * Discover's library on a computer (2.0; his word, 2026-11-28: "push out the
 * discover redesign update", after "the https://purifyapp.net/discover design
 * is outdated"): the phone's own doors, each its picture, its name and its
 * line, laid side by side, where the computer had a row of pills and cards
 * with icons and no pictures. The bands are the phone's (GalleryBand), at the
 * height the councils' page gives them on a computer, two across and then
 * three; Silver Night's tiles where it is on, four across, as the phone
 * switches them (components/art/DiscoverDoors.tsx).
 *
 * In the reader's own order, as on the phone: the order is kept on the device
 * (lib/discover/doorOrder.ts), laid on these doors before the first paint by
 * the same small script, and read here once the page has started. Moving a
 * door is the phone's: a hold and a drag are a finger's, not a mouse's.
 */
export function DoorGrid({ doors }: { doors: GridDoor[] }) {
  const art = useArt();
  const first = useMemo(() => doors.map((d) => d.href), [doors]);
  const firstKey = first.join("\n");
  const orderKey = useSyncExternalStore(subscribeOrder, () => readOrder(first).join("\n"), () => firstKey);
  if (art) return <ArtTiles doors={doors} className="md:grid-cols-3 md:gap-x-5 md:gap-y-8 xl:grid-cols-4" />;
  const byHref = new Map(doors.map((d) => [d.href, d]));
  const shown = orderKey.split("\n").flatMap((href) => byHref.get(href) ?? []);
  return (
    <ul data-door-grid="" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {shown.map((door, i) => (
        <li key={door.href} data-door={door.href}>
          <GalleryBand
            href={door.href}
            size="tall"
            title={door.title}
            line={door.line}
            badge={door.badge}
            picture={door.picture}
            focus={door.focus}
            // The tile's tiny preview, blurred, at once: never an empty box while the picture comes.
            preview={TILE_PREVIEWS[door.picture]?.src}
            // The first two rows are asked for at once.
            priority={i < 6}
          />
        </li>
      ))}
    </ul>
  );
}
