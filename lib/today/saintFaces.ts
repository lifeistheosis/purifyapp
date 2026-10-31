import { avifFor, streamedUrl } from "@/lib/media/streamed";
import type { Gaze, QuoteFace } from "@/lib/share/verseCard";

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

/**
 * Where his face is on each cover, and the way he looks, for his picture
 * when his words are shared (1.8, round 3 r3-11: the Portrait stands him on
 * the side he looks from, so he looks into his words; the Seal is cut round
 * his face). Found by eye on 2026-10-30, each cover opened large on a grid:
 * the point between his eyes and his mouth, 0 to 1 across and down, and
 * "left" or "right" where his head is turned that way as the viewer sees it,
 * "ahead" where he faces us (he then stands on the left, as the owner's
 * reference had its portrait). The sheet's own points were kept where it had
 * them; St Augustine looks up to the right, to the light, where the sheet had
 * him looking left. lib/today/__tests__/saintFaces.test.ts holds it to
 * SAINT_FACES, cover for cover.
 */
export const COVER_FACES: Readonly<Record<string, readonly [number, number, Gaze]>> = {
  "agatho-of-rome": [0.49, 0.25, "ahead"],
  "anthony-the-great": [0.48, 0.3, "right"],
  "apostle-andrew": [0.35, 0.24, "left"],
  "apostle-bartholomew": [0.45, 0.28, "ahead"],
  "apostle-james-alphaeus": [0.56, 0.37, "right"],
  "apostle-james-zebedee": [0.51, 0.37, "right"],
  "apostle-john": [0.72, 0.2, "right"],
  "apostle-jude": [0.4, 0.42, "left"],
  "apostle-matthew": [0.47, 0.35, "right"],
  "apostle-matthias": [0.52, 0.41, "right"],
  "apostle-paul": [0.26, 0.24, "left"],
  "apostle-peter": [0.72, 0.23, "left"],
  "apostle-philip": [0.46, 0.31, "ahead"],
  "apostle-simon-zealot": [0.46, 0.4, "ahead"],
  "apostle-thomas": [0.29, 0.31, "ahead"],
  "archangel-michael": [0.75, 0.24, "left"],
  "athanasius-the-great": [0.5, 0.33, "right"],
  "augustine-of-hippo": [0.47, 0.27, "right"],
  "basil-the-great": [0.74, 0.23, "right"],
  "constantine-the-great": [0.48, 0.3, "ahead"],
  "cyril-of-alexandria": [0.36, 0.3, "ahead"],
  "ephraim-the-syrian": [0.5, 0.35, "ahead"],
  "epiphanius-of-salamis": [0.57, 0.3, "right"],
  "eustathius-of-antioch": [0.45, 0.32, "ahead"],
  "florian-of-lorch": [0.5, 0.3, "right"],
  "gregory-of-nyssa": [0.49, 0.24, "ahead"],
  "gregory-palamas": [0.5, 0.33, "ahead"],
  "gregory-the-dialogist": [0.51, 0.3, "ahead"],
  "gregory-theologian": [0.65, 0.27, "right"],
  hilarion: [0.51, 0.31, "ahead"],
  "hosius-of-cordova": [0.52, 0.3, "ahead"],
  "ignatius-of-antioch": [0.48, 0.28, "left"],
  "jerome-of-stridon": [0.5, 0.28, "ahead"],
  "john-chrysostom": [0.3, 0.25, "left"],
  "john-of-damascus": [0.71, 0.25, "left"],
  "justin-martyr": [0.52, 0.27, "ahead"],
  "leo-the-great": [0.54, 0.46, "ahead"],
  "mary-magdalene": [0.5, 0.35, "ahead"],
  "mary-of-egypt": [0.58, 0.32, "right"],
  "maximus-the-confessor": [0.52, 0.34, "ahead"],
  "meletius-of-antioch": [0.45, 0.31, "right"],
  "nicholas-the-wonderworker": [0.43, 0.27, "right"],
  "paul-of-thebes": [0.46, 0.3, "ahead"],
  "polycarp-of-smyrna": [0.47, 0.33, "right"],
  "prochorus-the-deacon": [0.48, 0.35, "left"],
  "seraphim-of-sarov": [0.47, 0.4, "ahead"],
  "spyridon-of-trimythous": [0.48, 0.32, "ahead"],
  "theodosius-the-great": [0.45, 0.44, "right"],
  theotokos: [0.5, 0.38, "left"],
};

/**
 * The icons the app carries that a shared picture may show, when the cover
 * cannot be had (no signal) or there is none: only those whose rights are
 * recorded (lib/saints/iconRights.ts, ICON_RIGHTS), never one still in the
 * debt, and not the one whose iconographer is still unnamed
 * (MISSING_ATTRIBUTION). Its file names alone, so Today does not read the
 * rights registry; the test holds every one to a settled row there.
 */
export const SHAREABLE_ICONS: ReadonlySet<string> = new Set([
  "abraham-of-smolensk.jpg",
  "adrian-and-natalia.jpg",
  "aemilian-of-cyzicus.jpg",
  "agathonicus-of-nicomedia.jpg",
  "alexander-of-svir.jpg",
  "alypius-the-stylite.jpg",
  "ammon-of-nitria.jpg",
  "andrew-stratelates.jpg",
  "anthony-the-roman.jpg",
  "arsenius-the-great.jpg",
  "basil-the-blessed.jpg",
  "cyprian-of-carthage.jpg",
  "dalmatus-of-constantinople.jpg",
  "daniel-the-stylite.jpg",
  "diomedes-the-physician.jpg",
  "dometius-the-persian.jpg",
  "eusignius-of-antioch.jpg",
  "euplus-of-catania.jpg",
  "floros-and-lauros.jpg",
  "herman-of-alaska.jpg",
  "hilarion-the-great.jpg",
  "job-of-pochaev.jpg",
  "lawrence-the-archdeacon.jpg",
  "lupus-of-thessaloniki.jpg",
  "maccabean-martyrs.jpg",
  "macarius-the-great.jpg",
  "myron-of-crete.jpg",
  "myron-of-cyzicus.jpg",
  "nikolaj-velimirovic.jpg",
  "or-of-the-thebaid.jpg",
  "pachomius-the-great.jpg",
  "patriarchs-alexander-john-paul.jpg",
  "peter-of-moscow.jpg",
  "phanourios-the-newly-revealed.jpg",
  "photius-and-anicetus.jpg",
  "pimen-the-great.jpg",
  "prophet-micah.jpg",
  "prophet-samuel.jpg",
  "saint-george.jpg",
  "seven-sleepers-of-ephesus.jpg",
  "sixtus-of-rome.jpg",
  "stephen-the-protomartyr.jpg",
  "symeon-of-the-wonderful-mountain.v2.jpg",
  "symeon-the-stylite.jpg",
  "thaddeus-of-edessa.jpg",
  "theodore-and-vasily-of-the-caves.jpg",
  "tikhon-of-zadonsk.jpg",
  "titus-of-crete.jpg",
]);

/** Where the face is on a carried icon placed by eye; any other is a standing figure, his head near its top. */
const ICON_FACES: Readonly<Record<string, readonly [number, number]>> = {
  "cyprian-of-carthage.jpg": [0.49, 0.32],
};

/**
 * His face for a picture of his words (lib/share/verseCard.ts, QuoteFace):
 * his cover portrait, asked of the website in the apps, with the icon the app
 * carries for when it cannot be had, where its rights are recorded. A saint
 * with no cover has that icon alone; one with neither has no face, and the
 * picture takes its form for no portrait.
 */
export function quoteFace(saint: { slug: string; iconUrl?: string } | null | undefined, native: boolean): QuoteFace | null {
  if (!saint) return null;
  const file = saint.iconUrl?.startsWith("/saints/icons/") ? saint.iconUrl.slice("/saints/icons/".length) : null;
  const carried = file && SHAREABLE_ICONS.has(file) ? { src: saint.iconUrl!, point: ICON_FACES[file] ?? [0.5, ICON_FOCUS / 100 + 0.04], looks: "ahead" as const } : null;
  const face = COVER_FACES[saint.slug];
  if (face && saint.slug in SAINT_FACES) {
    return { src: streamedUrl(coverFile(saint.slug), native), point: [face[0], face[1]], looks: face[2], fallback: carried };
  }
  return carried ? { ...carried, fallback: null } : null;
}

/**
 * Who stands beside a saying of the Desert Fathers on Today (1.8, round 3
 * r3-21, the owner's pick A, "The face beside the words"; BUILD-80-NOTES 64),
 * the same face the picture of the saying shares. One entry for each Father
 * with a picture that has been checked, keyed by his page where the saying
 * names one (data/today/sayings.json, `speaker`), else by his name as the
 * saying gives it ("Abba Moses"). `cover` is a cover portrait of the reading
 * room (COVER_FACES); `icon` is an icon the app carries whose rights are
 * recorded (SHAREABLE_ICONS), with the point between his eyes and his mouth
 * and the way he looks. An entry under DESERT_FATHERS, once an icon of the
 * desert Fathers together is checked, stands beside every Father with none of
 * his own.
 *
 * Abba Moses and Abba Isaac have none, so their sayings stand with the lit
 * cross where the Father would stand, never a stand-in: no public-domain icon
 * of either has been checked, the app's St Moses the Ethiopian has no rights
 * recorded and Cassian never says his Abba Moses is that Moses, and
 * isaac-the-syrian.jpg is another Isaac, of the seventh century. The owner's
 * word of 2026-10-31: Abba Moses stays without a face until he says.
 */
export const SAYING_FACES: Readonly<Record<string, SayingFace>> = {
  // St Antony's eight, his own words and the one Abba Isaac tells.
  "anthony-the-great": { cover: "anthony-the-great" },
};

/** The key of the one picture that stands beside every Father with none of his own. */
export const DESERT_FATHERS = "desert-fathers";

export type SayingFace =
  | { cover: string }
  | { icon: string; point: readonly [number, number]; looks: Gaze };

/** The Father's face beside his saying, and on its picture; null for the lit cross. */
export function sayingFace(
  saying: { speaker?: string; attribution: string },
  native: boolean,
  faces: Readonly<Record<string, SayingFace>> = SAYING_FACES,
): QuoteFace | null {
  const entry = faces[saying.speaker ?? saying.attribution] ?? faces[DESERT_FATHERS];
  if (!entry) return null;
  if ("cover" in entry) return quoteFace({ slug: entry.cover }, native);
  // An icon whose rights are not recorded is no face, whatever the entry says.
  if (!SHAREABLE_ICONS.has(entry.icon)) return null;
  return { src: `/saints/icons/${entry.icon}`, point: entry.point, looks: entry.looks, fallback: null };
}

/** A side of a band, as the eye sees it: a face looks the same way in every language. */
export type BandSide = "left" | "right";

/**
 * Which side of a band of The Church today the speaker stands on (round 3
 * r3-21 A): the side he looks from, so he looks into his words, as the shared
 * Portrait stands him. One who faces us stands at the band's end, where the
 * saint's face stood before, as the sheet drew it.
 */
export function standsOn(looks: Gaze, rtl = false): BandSide {
  if (looks === "left") return "right";
  if (looks === "right") return "left";
  return rtl ? "left" : "right";
}

/**
 * The portrait as r3-21 sets it on a band (its inject script's fitPics): the
 * band at least 216 px tall, the picture 1.45 times its height, the face a
 * third of the way down and 78% across on the right, 20% on the left.
 */
export const BAND_PORTRAIT = { minHeight: 216, zoom: 1.45, eye: 0.33, across: { right: 0.78, left: 0.2 } } as const;

/**
 * Where a portrait stands in a band `box` (px) so his face (`point`, 0 to 1
 * across and down the picture) lands where the sheet set it. `aspect` is the
 * picture's width over its height: the covers are 4 wide by 5 tall. It covers
 * the band from top to foot and reaches the band's edge on his side, so the
 * face is never cut and no ground shows past him. A long saying makes a tall
 * band: the picture then grows only until it is as wide as the band, so his
 * face does not grow with the words.
 */
export function placePortrait(
  box: { width: number; height: number },
  point: readonly [number, number],
  side: BandSide,
  aspect = 0.8,
): { left: number; top: number; width: number; height: number } {
  const { width: W, height: H } = box;
  const height = Math.max(H, Math.min(H * BAND_PORTRAIT.zoom, W / aspect));
  const width = height * aspect;
  const left = BAND_PORTRAIT.across[side] * W - point[0] * width;
  const top = BAND_PORTRAIT.eye * H - point[1] * height;
  return {
    left: side === "right" ? Math.max(left, W - width) : Math.min(left, 0),
    top: Math.min(0, Math.max(H - height, top)),
    width,
    height,
  };
}
