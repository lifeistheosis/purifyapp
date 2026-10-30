/**
 * Where the face sits in an icon the app carries (public/saints/icons), for
 * the saint web's round frames (1.8, round 3, sheet r3-06).
 *
 * The web cuts every icon to a circle 20% from its top, which suits an icon of
 * a saint's head and shoulders, most of them. A standing figure is three times
 * as tall as it is wide, and 20% down him is his chest: on his own web, St John
 * Chrysostom's circle showed his vestments and not his face. These are the
 * icons that cut misses, each opened and its face found by eye, as a share
 * from the top for `object-position` (0 is the icon's top edge, 100 its foot).
 * Every other icon keeps 20%. lib/saints/__tests__/iconFaces.test.ts holds
 * that every icon two and a half times as tall as it is wide, or more, has
 * its row here.
 *
 * Not lib/today/saintFaces.ts: those are the faces in the cover portraits the
 * website streams (lib/reading/coverArt.ts), a different picture cut four wide
 * by five tall around the face, where St John's sits at 20%.
 *
 * Imports nothing, so the screen can read it.
 */

/** The cut every other icon keeps. */
export const WEB_FACE_DEFAULT = 20;

export const ICON_FACES: Readonly<Record<string, number>> = {
  // 152 by 420, standing: his halo at the top edge, his face a seventh down.
  "anthony-the-great.jpg": 2,
  // 118 by 420, standing: the face a seventh down, under the halo.
  "celestine-of-rome.jpg": 2,
  // 140 by 420, standing: the face a tenth down, his halo near the top edge.
  "john-chrysostom.jpg": 2,
};

/** Where to cut an icon for a round frame: its own point, or 20%. */
export function iconFace(src: string | undefined): number {
  if (!src) return WEB_FACE_DEFAULT;
  const file = src.split(/[?#]/)[0].split("/").pop() ?? "";
  return ICON_FACES[file] ?? WEB_FACE_DEFAULT;
}
