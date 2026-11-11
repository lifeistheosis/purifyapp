// The icon at the head of each prayer page (1.7).
//
// The owner's note 16 of 2026-10-16 asked for a page per service with the
// hour's art at its head. Every picture here is one of the eight
// public-domain icons the app already carries (public/icons/prayer, listed
// with their sources in lib/prayers/icons.ts), so the pages add nothing to
// the download, and each was opened before it was paired.
//
// Which icon stands over which prayer is a choice about meaning, so each
// pairing says why, and the whole list waits for a future clergy review
// (docs/editorial-standards.md: there is no priest reviewing yet; the choice
// is made as canonically as we can and marked for that review).

import { getPrayerIcon, type PrayerIcon } from "@/lib/prayers/icons";

const ART: Record<string, string> = {
  // The Hours, each by what it remembers.
  "first-hour": "christ-pantocrator", // its closing prayer to Christ, the true Light
  "third-hour": "pentecost", // the descent of the Holy Spirit at the third hour
  "sixth-hour": "crucifixion", // the nailing to the Cross at the sixth hour
  "ninth-hour": "entombment", // the Lord's death at the ninth hour (the Crucifixion is the other reading)
  compline: "theotokos-of-vladimir", // Compline closes on its prayers to the Mother of God
  // The daily rule.
  "upon-waking": "anastasis", // rising from sleep, as from the tomb
  morning: "anastasis",
  midday: "crucifixion", // the midday rule keeps the Sixth Hour's troparion
  evening: "christ-pantocrator",
  "before-sleep": "theotokos-of-vladimir",
  pascha: "anastasis",
  creed: "three-hierarchs", // the Fathers who confessed the Symbol of Faith
  // The akathist, and the lessons.
  "akathist-theotokos": "theotokos-of-vladimir",
  learning: "three-hierarchs",
  // A reader's own rule: each part under its own icon, as the prayer book
  // stands its Morning and Evening prayers (1.8, the owner's pick A of
  // r3-27; docs/editorial-standards.md, Clergy item 26).
  "mine-morning": "anastasis",
  "mine-evening": "christ-pantocrator",
  mine: "christ-pantocrator",
};

/** Every other prayer stands under Christ Pantocrator, the face a prayer is said before. */
const DEFAULT_ART = "christ-pantocrator";

/** The icon for a prayer page, by its rule's id (or "learning", "mine"). */
export function serviceArt(id: string): PrayerIcon {
  return getPrayerIcon(ART[id] ?? DEFAULT_ART) ?? getPrayerIcon(DEFAULT_ART)!;
}

/** The pairings themselves, for the test that every one names a real icon. */
export function serviceArtPairs(): [string, string][] {
  return Object.entries(ART);
}

/**
 * The copy of an icon a page draws across a phone's width, the largest the
 * app carries, and where in it Christ's face is, so a crop keeps it: the
 * Prayers tab's own Christ Pantocrator of Sinai, 1290 pixels wide
 * (lib/media/sections.ts), where the prayer pages' copy is 392; the
 * Anastasis from the prayer pages' own copy, 542 pixels, the most it holds.
 * lib/prayers/__tests__/serviceArt.test.ts reads each file's pixels.
 */
export const WIDE_CUTS: Readonly<Record<string, { src: string; width: number; height: number; focus: string }>> = {
  anastasis: { src: "/icons/prayer/anastasis.jpg", width: 542, height: 800, focus: "50% 34%" },
  "christ-pantocrator": { src: "/sections/prayers.v4.jpg", width: 1290, height: 1359, focus: "50% 30%" },
};

/**
 * The name a half's picture travels under, from Your rule's tile on Prayers
 * into the head of the page it opens and back (1.9; lib/ui/routeMotion.ts,
 * "A picture that leads to its own page"). A name of its own kind, not the
 * picture's address: the tile wears the icon in the cut his sheet drew for
 * it, and the head the same icon in its wide cut, which for the Pantocrator
 * is another file of the same painting (WIDE_CUTS above).
 */
export function ruleCarry(part: "morning" | "evening"): string {
  return `rule:${part}`;
}

/** The icon Your rule's tile wears for the half the page will open on: the icon at that half's head. */
export function ruleTileArt(part: "morning" | "evening"): PrayerIcon {
  return serviceArt(part === "morning" ? "mine-morning" : "mine-evening");
}

/** The picture at the head of Your rule (1.8, r3-27 A): the part's own icon, wide. */
export function ruleHeadArt(part: "morning" | "evening"): { src: string; width: number; height: number; focus: string; alt: string } {
  const icon = serviceArt(part === "morning" ? "mine-morning" : "mine-evening");
  // Each part's icon has its wide cut (the test holds it); the Pantocrator otherwise.
  const slug = WIDE_CUTS[icon.slug] ? icon.slug : DEFAULT_ART;
  return { ...WIDE_CUTS[slug], alt: (getPrayerIcon(slug) ?? icon).alt };
}
