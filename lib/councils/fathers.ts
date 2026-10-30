import { coverArtFor, coverSrc } from "@/lib/reading/coverArt";
import { getSaint } from "@/lib/saints/saints";

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
 * or who has no icon at all, is drawn by his name, a halo and his initial on
 * the page's own ground, never a face, until his icon is checked, as the
 * room's covers and the widgets already do (the sheet's "A Father with no
 * settled icon"). Of the thirty-six Fathers the councils name, fifteen have a
 * settled picture (lib/councils/__tests__/page.test.ts counts them).
 */
export type CouncilFace = {
  /** His name as the council names him. */
  name: string;
  /** The word under his face: his first name, or what tells two of one name apart. */
  label: string;
  /** His initial, drawn in the halo when he has no settled picture. */
  initial: string;
  /** His byname on his saint's page ("Pillar of Orthodoxy"), when he has one. */
  byname?: string;
  /** His part at the council. */
  role: string;
  /** His saint's page, when Purify has one. */
  href?: string;
  /** His settled picture: its address (decided by the build) and where his face is, percent from its top. */
  picture?: { src: string; focusY: number };
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

export function fatherFaces(c: Pick<Council, "principalFathers">, native: boolean): CouncilFace[] {
  const fathers = c.principalFathers ?? [];
  const firsts = fathers.map((f) => firstNameOf(f.name));
  return fathers.map((f, i) => {
    const shared = firsts.filter((n) => n === firsts[i]).length > 1;
    const saint = f.slug ? getSaint(f.slug) : undefined;
    const art = saint ? coverArtFor(saint.slug) : null;
    return {
      name: f.name,
      label: shared ? lastWordOf(f.name) : firsts[i],
      initial: firsts[i].charAt(0).toUpperCase(),
      ...(saint?.byname ? { byname: saint.byname } : {}),
      role: f.role,
      ...(saint ? { href: `/saints/${saint.slug}` } : {}),
      ...(art ? { picture: { src: coverSrc(art, native), focusY: art.focusY } } : {}),
    };
  });
}
