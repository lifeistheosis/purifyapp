// How a prayer icon is cut to stand in a small box (1.8, note 72).
//
// The Prayers tab's Practices wear their icons as tiles two across, and the
// prayer book's rows for the Hours and the akathists as small plates (the
// owner's pick of r3-26: "A, the icon tiles. C, one prayer book."). The icons
// are the app's own (public/icons/prayer, lib/prayers/icons.ts), painted
// taller than wide, so each is cut where its meaning is: the faces, the
// Spirit's descent, the Cross. The cuts of the four drawn on the sheet are
// its own; the Sixth and the Ninth Hour's, which the Hours tile wears in the
// afternoon, were drawn the same way and looked at before they went in.
//
// A cut is the picture covering its box, held at `focus` (a CSS position, as
// object-position takes it) and drawn `zoom` times closer about that point:
// the sheet's background-size of 122% at 50% 30% is { zoom: 1.22, focus:
// "50% 30%" } on an icon wider than its box's share. Nothing is cropped on
// disk, so nothing is added to the download.

import type { CSSProperties } from "react";

export type Crop = { zoom: number; focus: string };

/** A tile two across, about 169 by 146 on a 390px phone. */
const TILE: Readonly<Record<string, Crop>> = {
  // The Third Hour: the apostles under the vault as the Spirit comes down.
  pentecost: { zoom: 1.22, focus: "50% 30%" },
  // Akathists, and Compline: the two faces, cheek to cheek.
  "theotokos-of-vladimir": { zoom: 1.12, focus: "42% 40%" },
  // Learn to pray: the three Hierarchs' heads and their omophoria.
  "three-hierarchs": { zoom: 1.18, focus: "50% 9%" },
  // Your rule, and the First Hour: the face of Christ in its halo.
  "christ-pantocrator": { zoom: 1.04, focus: "50% 21%" },
  // Your rule in its morning half (1.9): Christ in white, His hand to Adam's.
  anastasis: { zoom: 1.15, focus: "50% 40%" },
  // The Sixth Hour: Christ on the Cross, with His Mother and St John.
  crucifixion: { zoom: 1.5, focus: "50% 30%" },
  // The Ninth Hour: the mourners over the Lord laid in the tomb.
  entombment: { zoom: 1.2, focus: "45% 55%" },
};

/** A row's plate, 30 by 40. */
const PLATE: Readonly<Record<string, Crop>> = {
  pentecost: { zoom: 1.9, focus: "52% 30%" },
  "theotokos-of-vladimir": { zoom: 1.6, focus: "22% 32%" },
  "christ-pantocrator": { zoom: 1.5, focus: "50% 14%" },
  crucifixion: { zoom: 2.2, focus: "50% 32%" },
  entombment: { zoom: 1.9, focus: "40% 55%" },
};

/** An icon with no cut of its own is shown whole across, from its head. */
const WHOLE: Crop = { zoom: 1, focus: "50% 0%" };

export function tileCrop(iconSlug: string): Crop {
  return TILE[iconSlug] ?? WHOLE;
}

export function plateCrop(iconSlug: string): Crop {
  return PLATE[iconSlug] ?? WHOLE;
}

/** The cuts themselves, for the test that each names a real icon and stays sharp. */
export function cropTables(): { tile: Readonly<Record<string, Crop>>; plate: Readonly<Record<string, Crop>> } {
  return { tile: TILE, plate: PLATE };
}

/** A cut as the <img>'s own style: it covers its box, held at the focus, drawn closer about it. */
export function cropStyle({ zoom, focus }: Crop): CSSProperties {
  return {
    objectPosition: focus,
    ...(zoom !== 1 ? { transform: `scale(${zoom})`, transformOrigin: focus } : {}),
  };
}
