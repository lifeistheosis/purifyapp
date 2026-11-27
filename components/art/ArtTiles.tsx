"use client";

// Discover's doors as tiles two across, each with its own picture (2.0,
// Silver Night; the method is docs/brand/art/IMPLEMENT.md, section 2): the
// place's name on the picture's dark foot, the app's own line about what is
// inside under the tile, whole and never cut short (his 1.8 pick kept the line).
// The picture is the place's one picture (lib/art/art.ts) and travels into the
// head of the page the door opens (data-carry, lib/ui/routeMotion.ts).
//
// A door whose picture is not made yet shows its old one in grayscale, so the
// grid keeps one tone until it is. The reader's own order of the doors is kept
// (lib/discover/doorOrder.ts); rearranging stays with the list for now.
//
// The picture is a dark island on every palette, so its name reads in the dark
// palette's ink on the Light one too (app/globals.css, .dark-island).

import Link from "next/link";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { carryKey, doorArt } from "@/lib/art/art";
import { readOrder, subscribeOrder } from "@/lib/discover/doorOrder";

export type TileDoor = { href: string; title: ReactNode; line: ReactNode; picture: string; focus?: string };

export function ArtTiles({ doors }: { doors: TileDoor[] }) {
  const first = useMemo(() => doors.map((d) => d.href), [doors]);
  const order = useSyncExternalStore(subscribeOrder, () => readOrder(first).join("|"), () => first.join("|"));
  const byHref = new Map(doors.map((d) => [d.href, d]));
  const shown = order.split("|").flatMap((href) => byHref.get(href) ?? []);
  return (
    <ul data-art-tiles="" className="grid grid-cols-2 gap-x-3 gap-y-5">
      {shown.map((door, i) => (
        <li key={door.href}>
          <ArtTile door={door} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}

function ArtTile({ door, priority }: { door: TileDoor; priority: boolean }) {
  const made = doorArt(door.href);
  const loading = priority ? "eager" : "lazy";
  return (
    <Link href={door.href} data-art-tile="" className="press-card block">
      <span data-carry={made ? carryKey(made.key) : undefined} className="dark-island relative block aspect-[4/3] overflow-hidden rounded-[20px] bg-night-soft">
        {made ? (
          <picture>
            <source type="image/avif" srcSet={made.art.avif} />
            <img src={made.art.webp} alt="" width={made.art.width} height={made.art.height} loading={loading} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          </picture>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are.
          <img src={door.picture} alt="" loading={loading} decoding="async" className="absolute inset-0 h-full w-full object-cover grayscale" style={{ objectPosition: door.focus ?? "50% 30%" }} />
        )}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-night-deep via-night-deep/70 to-transparent" />
        <span data-carry-over="" className="absolute inset-x-0 bottom-0 px-3.5 pb-3 font-heading text-[17px] font-bold leading-[1.15] text-paper">
          {door.title}
        </span>
      </span>
      <span className="mt-2 block px-0.5 font-sans text-caption leading-[1.4] text-paper/70">{door.line}</span>
    </Link>
  );
}
