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
  // A reader's own rule.
  "mine-morning": "christ-pantocrator",
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
