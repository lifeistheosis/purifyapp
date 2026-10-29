import { avifFor, streamedUrl } from "@/lib/media/streamed";

/**
 * The day's saint on Today, his face (1.8, the owner's answer to round 12:
 * "St. John Chrysostom himself", the face and not the vestments).
 *
 * The icons the app carries (public/saints/icons) are too narrow to cut to a
 * face: St John Chrysostom's is 140 px wide, a whole standing figure. The
 * saint's cover portrait is the face: the icon his books wear in the reading
 * room, cut four wide by five tall at about 600 by 750, every one opened and
 * its rights recorded (lib/reading/coverArt.ts, docs/licensing/COVER_ICONS.md).
 * It lives on the website under /covers/authors/ and the apps ask the website
 * for it (lib/media/streamed.ts), as the reading room does, so the apps carry
 * none of them. With no signal the band falls back to the icon the app does
 * carry, and a saint with neither has a band with no picture.
 *
 * SAINT_FACES is the streamed covers of lib/reading/coverArt.ts, saint by
 * saint, with where each face sits from the top. Only that, because the
 * covers' registry carries every picture's rights in full and Today would
 * read all of it on every cold open for two numbers.
 * lib/today/__tests__/saintFaces.test.ts holds the two lists together.
 */
export const SAINT_FACES: Readonly<Record<string, number>> = {
  "agatho-of-rome": 26,
  "anthony-the-great": 32,
  "apostle-andrew": 20,
  "apostle-bartholomew": 25,
  "apostle-james-alphaeus": 31,
  "apostle-james-zebedee": 28,
  "apostle-john": 20,
  "apostle-jude": 33,
  "apostle-matthew": 35,
  "apostle-matthias": 30,
  "apostle-paul": 20,
  "apostle-peter": 20,
  "apostle-philip": 32,
  "apostle-simon-zealot": 33,
  "apostle-thomas": 29,
  "archangel-michael": 20,
  "athanasius-the-great": 33,
  "augustine-of-hippo": 26,
  "basil-the-great": 20,
  "constantine-the-great": 29,
  "cyril-of-alexandria": 29,
  "ephraim-the-syrian": 33,
  "epiphanius-of-salamis": 30,
  "eustathius-of-antioch": 33,
  "florian-of-lorch": 33,
  "gregory-of-nyssa": 24,
  "gregory-palamas": 35,
  "gregory-the-dialogist": 30,
  "gregory-theologian": 20,
  hilarion: 35,
  "hosius-of-cordova": 28,
  "ignatius-of-antioch": 29,
  "jerome-of-stridon": 30,
  "john-chrysostom": 20,
  "john-of-damascus": 25,
  "justin-martyr": 27,
  "leo-the-great": 45,
  "mary-magdalene": 36,
  "mary-of-egypt": 27,
  "maximus-the-confessor": 31,
  "meletius-of-antioch": 32,
  "nicholas-the-wonderworker": 20,
  "paul-of-thebes": 30,
  "polycarp-of-smyrna": 34,
  "prochorus-the-deacon": 34,
  "seraphim-of-sarov": 40,
  "spyridon-of-trimythous": 32,
  "theodosius-the-great": 36,
  theotokos: 24,
};

/** Where the head sits in one of the app's own icons, a standing figure: near its top. */
export const ICON_FOCUS = 12;

/** The cover portrait's file on the website (lib/reading/coverArt.ts, fromHero and authorCovers). */
export function coverFile(slug: string): string {
  return `/covers/authors/${slug}.v1.jpg`;
}

export type SaintPicture =
  /** His cover portrait from the website, and his icon for when it cannot be had. */
  | { kind: "cover"; src: string; avif: string | null; fallback: string | null; focusY: number }
  /** The icon the app carries: the only picture of him there is. */
  | { kind: "icon"; src: string; focusY: number };

/**
 * The picture the saint's band shows: his cover portrait where he has one,
 * else his icon, else none. `native` is whether this is the apps, which ask
 * the website for the portrait.
 */
export function saintPicture(saint: { slug: string; iconUrl?: string } | null | undefined, native: boolean): SaintPicture | null {
  if (!saint) return null;
  const focusY = SAINT_FACES[saint.slug];
  if (focusY !== undefined) {
    const src = streamedUrl(coverFile(saint.slug), native);
    return { kind: "cover", src, avif: avifFor(src), fallback: saint.iconUrl ?? null, focusY };
  }
  if (saint.iconUrl) return { kind: "icon", src: saint.iconUrl, focusY: ICON_FOCUS };
  return null;
}
