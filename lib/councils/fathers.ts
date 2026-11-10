import { coverArtFor, coverSrc, type CoverArt } from "@/lib/reading/coverArt";
import { iconRightsFor } from "@/lib/saints/iconRights";
import { getSaint } from "@/lib/saints/saints";
import { COVER_FACES, ICON_FOCUS, iconAcross } from "@/lib/today/saintFaces";

import type { Council } from "./councils";

/**
 * "The Holy Fathers principally associated" with a council, each with his
 * face (1.8, the owner's build 80 note 11: "show each Father with his icon.
 * Only icons already in the library"; his pick of r3-03, C's "at a glance":
 * one Father at a time, with a row of faces to tap).
 *
 * A face is a settled picture only: the one the reading room's covers of him
 * carry (lib/reading/coverArt.ts), opened, cut and credited. A Father whose
 * icon in the library has no rights record yet (lib/saints/iconRights.ts),
 * or who has no icon at all, stands on the plate a book with no cover wears,
 * his name beside it (1.9, build 90 note 3, the owner's yes: "a plate, never
 * another saint's face"; until then a halo and his initial, which read as a
 * picture missing). lib/councils/__tests__/page.test.ts counts the faces.
 *
 * FRAMED ABOUT HIS FACE (build 90 note 3: "they do show and it's not framed
 * correctly"). A portrait with him to one side is cut about his face, where
 * COVER_FACES records it, and a carried icon placed by eye where ICON_FACES
 * does (lib/today/saintFaces.ts), through the house's one framed face
 * (components/today/SaintFace.tsx, faceShift). St John of Damascus stands at
 * 0.71 across his portrait, St Gregory the Theologian at 0.65, St Cyril of
 * Alexandria at 0.36: each was cut off-centre about the portrait's middle.
 *
 * WITH NO SIGNAL (build 83's walk of the apps). Most of those pictures are
 * cover portraits on the website, which the apps ask for, so with no signal
 * a Father fell back to his initial. A Father whose portrait streams falls
 * back first to the icon the app carries of him, as Theology's medallions
 * do, but only where that icon's rights are settled, a row in
 * lib/saints/iconRights.ts (verified, or used with permission, as the room's
 * carried covers are); the rest keep the halo and initial, as drawn.
 */
export type FacePicture = {
  /** Its address, decided by the build: the website's in the apps for a streamed portrait. */
  src: string;
  /** Where his face is, percent from its top. */
  focusY: number;
  /** Where his face is across it, 0 to 1, where that is recorded: the frame is cut about it. */
  across?: number;
};

export type CouncilFace = {
  /** His name as the council names him. */
  name: string;
  /** The word under his face: his first name, or what tells two of one name apart. */
  label: string;
  /** His byname on his saint's page ("Pillar of Orthodoxy"), when he has one. */
  byname?: string;
  /** His part at the council. */
  role: string;
  /** His saint's page, when Purify has one. */
  href?: string;
  /** His settled picture, and for one the website streams, the settled icon the app carries for when it cannot come. */
  picture?: FacePicture & { fallback?: FacePicture };
};

/** The words before a name that are not his name. */
const HONOURS = /^(?:(?:Sts?|S)\.\s+|Pope\s+)+/;

/** His first name: "St. Pope Leo I (the Great)" is Leo, "Dositheos II, Patriarch of Jerusalem" Dositheos. */
export function firstNameOf(name: string): string {
  return name.replace(HONOURS, "").split(/[\s,(]+/)[0] ?? name;
}

/** The last word of his name, which tells two Fathers of one name apart (the Theologian, of Nyssa). */
function lastWordOf(name: string): string {
  const words = name.replace(/\([^)]*\)/g, "").replace(HONOURS, "").trim().split(/\s+/);
  return words[words.length - 1] ?? name;
}

/** The icon the app carries of a saint, only where its rights are settled (lib/saints/iconRights.ts). */
export function carriedIcon(saint: { iconUrl?: string } | null | undefined): FacePicture | null {
  return saint?.iconUrl && iconRightsFor(saint.iconUrl) ? { src: saint.iconUrl, focusY: ICON_FOCUS } : null;
}

/** Where his face is across his picture, where it is recorded: a portrait's in COVER_FACES, a carried icon's in ICON_FACES. */
function placeOf(art: CoverArt, slug: string | undefined): { across?: number } {
  const across = art.kind === "streamed" ? (slug ? COVER_FACES[slug]?.[0] : undefined) : iconAcross(art.file);
  return across === undefined ? {} : { across };
}

export function fatherFaces(c: Pick<Council, "principalFathers">, native: boolean): CouncilFace[] {
  const fathers = c.principalFathers ?? [];
  const firsts = fathers.map((f) => firstNameOf(f.name));
  return fathers.map((f, i) => {
    const shared = firsts.filter((n) => n === firsts[i]).length > 1;
    const saint = f.slug ? getSaint(f.slug) : undefined;
    const art = saint ? coverArtFor(saint.slug) : null;
    // A portrait from the website has a carried icon behind it, where one is settled.
    const fallback = art?.kind === "streamed" ? carriedIcon(saint) : null;
    return {
      name: f.name,
      label: shared ? lastWordOf(f.name) : firsts[i],
      ...(saint?.byname ? { byname: saint.byname } : {}),
      role: f.role,
      ...(saint ? { href: `/saints/${saint.slug}` } : {}),
      ...(art ? { picture: { src: coverSrc(art, native), focusY: art.focusY, ...placeOf(art, saint?.slug), ...(fallback ? { fallback } : {}) } } : {}),
    };
  });
}
