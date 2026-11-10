import { streamedUrl } from "@/lib/media/streamed";
import type { ReadingCoverPack } from "@/lib/packs/types";
import { packedReadingCovers } from "@/lib/readAloud/covers";

import type { FeelingDoor } from "./feelings";
import type { Card, Room } from "./select";

/**
 * The reading room's covers from the website, laid over the build's (1.9,
 * build 89 note 3: "so later ones go live from the website"). The covers
 * pack (lib/packs/types.ts, readCoversPack) carries each book's picture by
 * its work and each How you feel door's icon by its feeling, made by the
 * same functions the website's room is drawn with (lib/reading/cards.ts,
 * readingCovers). A book or a door the pack names takes the website's
 * picture; one it does not name keeps the build's; a book the build shows as
 * a window onto a larger picture (a council's document) keeps its window.
 *
 * The apps only: the website never places a pack (components/native/
 * PackBridge.tsx), so there this gives back what it was given. `placed` is
 * the covers' version (lib/readAloud/useCovers.ts): 0 until the pack is in
 * place, which is also what the page's first draw reads, so the export and
 * its first draw in the app agree (docs/PACKS.md, "Covers come after the
 * first draw").
 */
export function withPackedCovers(room: Room, placed: number): Room {
  const pack = placed > 0 ? packedReadingCovers() : null;
  if (!pack || (!pack.works && !pack.feelings)) return room;
  const works = pack.works ?? {};
  const cards = room.cards.map((card) => {
    const from = works[card.key];
    if (!from || card.cover?.crop) return card;
    return { ...card, cover: packedPicture(from) };
  });
  return { ...room, cards, feelings: packedDoors(room.feelings, placed) };
}

/** One book's card (a book's own page, lib/reading/select.ts HeaderCard) with the website's picture laid over the build's, as above. */
export function packedCard<C extends Pick<Card, "key" | "cover">>(card: C, placed: number): C {
  const from = placed > 0 ? packedReadingCovers()?.works?.[card.key] : undefined;
  return from && !card.cover?.crop ? { ...card, cover: packedPicture(from) } : card;
}

function packedPicture(from: ReadingCoverPack): NonNullable<Card["cover"]> {
  return { src: streamedUrl(from.file), focusY: from.focusY, ...(from.bookOnly ? { bookOnly: true as const } : {}) };
}

/** The doors with the website's icons laid over the build's, as above. */
export function packedDoors(doors: FeelingDoor[], placed: number): FeelingDoor[] {
  const feelings = placed > 0 ? packedReadingCovers()?.feelings : undefined;
  if (!feelings) return doors;
  return doors.map((door) => {
    const from = feelings[door.slug];
    return from ? { ...door, cover: { src: streamedUrl(from.file) } } : door;
  });
}
