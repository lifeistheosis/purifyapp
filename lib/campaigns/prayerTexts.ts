// The words of the prayers a campaign may carry (lib/campaigns/model.ts,
// CAMPAIGN_PRAYERS), read from the app's own files and never copied: a
// correction to a psalm or a prayer there reaches every campaign that names
// it.
//
// Where each is read from:
//
//   protection, repentance   the prayer book's own files, which hold Psalms
//                            90, 26 and 50
//   morning                  the morning prayers' file, which holds the
//                            Trisagion prayers
//   psalter                  the Bible's own file of that psalm (Brenton's
//                            Septuagint, data/bible/psalms): Psalms 24, 102,
//                            120 and 142, which the prayer book has no copy
//                            of. A verse a line, as the prayer book sets a
//                            psalm.
//
// The files are brought into the app's code here and nowhere a page loads by
// itself. A screen that needs a prayer's words asks for this file when it
// needs them (./useCampaignPrayer.ts), so the prayer reader, a campaign's
// page and the board carry none of it until a campaign with a prayer is on
// the screen. It travels inside the apps, so it is prayed offline.
//
// English, as the apps carry every prayer.

import psalm102 from "@/data/bible/psalms/102.json";
import psalm120 from "@/data/bible/psalms/120.json";
import psalm142 from "@/data/bible/psalms/142.json";
import psalm24 from "@/data/bible/psalms/24.json";
import morning from "@/data/prayers/rules/morning.json";
import protection from "@/data/prayers/rules/protection.json";
import repentance from "@/data/prayers/rules/repentance.json";
import type { Prayer, Rule } from "@/lib/prayers/types";

import { campaignPrayer, type CampaignPrayer, type PrayerRef } from "./model";

const FILES: Record<string, Rule> = {
  protection: protection as Rule,
  repentance: repentance as Rule,
  morning: morning as Rule,
};

/** A chapter of the Bible as its file holds it. */
export type Chapter = { book: string; chapter: number; verses: { n: number; text: string }[]; source: string };

/** The Bible's own files of the psalms a campaign may carry that the prayer book has no copy of, by the id a campaign keeps. */
const PSALTER: Record<string, Chapter> = {
  "psalm-24": psalm24 as Chapter,
  "psalm-102": psalm102 as Chapter,
  "psalm-120": psalm120 as Chapter,
  "psalm-142": psalm142 as Chapter,
};

/** The text the Bible's files are, by the name they give it: the same Psalter the prayer book prints its psalms from. */
export const PSALTER_SOURCE = "brenton-lxx-pd";

/** A prayer as a step of a campaign: which one, its own words, and the printing it is from. */
export type CampaignPrayerText = { ref: PrayerRef; entry: CampaignPrayer; prayer: Prayer; source: string };

/**
 * How much of a rule's own source line speaks of what a campaign carries
 * out of it. A rule names its printings in one line for everything it holds,
 * and a campaign carries one prayer: under it stand the rule's own words
 * about that prayer, as written, and not its words about its others.
 * Nothing is written here: the line is cut, never rephrased
 * (docs/editorial-standards.md, item 28), and
 * lib/campaigns/__tests__/model.test.ts holds each to being the start of its
 * rule's own line.
 *
 *   protection   "Psalms from Brenton's public-domain Septuagint." Then the
 *                petitions' printings, which are not the psalm's.
 *   repentance   The whole line: it is all about Psalm 50.
 *   morning      The whole line: it is the common prayers' own, and the
 *                Trisagion prayers are of them.
 */
const OWN_SENTENCES: Record<string, number> = { protection: 1, repentance: 2, morning: 99 };

/** The first `n` sentences of a source line, as written. */
export function sourceStart(source: string, n: number): string {
  let end = 0;
  for (let i = 0; i < n; i++) {
    const next = source.indexOf(". ", end);
    if (next < 0) return source;
    end = next + 2;
  }
  return source.slice(0, end).trim();
}

/**
 * The words of a psalm out of a file of the Bible's, a verse a line, or null
 * for a file that is not that psalm in that text. The printing said under a
 * psalm is Brenton's, so a file that says it is any other text is not read:
 * a psalm is never shown under a printing it is not from.
 */
export function psalterText(chapter: Chapter | undefined, number: number): string | null {
  if (!chapter || chapter.book !== "psalms" || chapter.chapter !== number || chapter.source !== PSALTER_SOURCE) return null;
  if (!Array.isArray(chapter.verses) || chapter.verses.length === 0) return null;
  const text = chapter.verses.map((v) => v.text.trim()).join("\n");
  return text || null;
}

/**
 * A psalm from the Bible's file, set as the prayer book sets one: its name,
 * and a verse a line. Its printing is said in the prayer book's own words
 * for the same Psalter ("Psalms from Brenton's public-domain Septuagint."),
 * and only for a file that says it is that text.
 */
function fromPsalter(known: CampaignPrayer): CampaignPrayerText | null {
  const text = known.number === undefined ? null : psalterText(PSALTER[known.id], known.number);
  if (!text) return null;
  return {
    ref: { rule: known.rule, id: known.id },
    entry: known,
    prayer: { id: known.id, title: `Psalm ${known.number}`, text },
    source: sourceStart(FILES.protection.source ?? "", OWN_SENTENCES.protection),
  };
}

export function campaignPrayerText(ref: { rule?: unknown; id?: unknown } | null | undefined): CampaignPrayerText | null {
  const known = campaignPrayer(ref);
  if (!known) return null;
  if (known.rule === "psalter") return fromPsalter(known);
  const rule = FILES[known.rule];
  const prayer = rule?.prayers.find((p) => p.id === known.id);
  if (!rule || !prayer || !prayer.text) return null;
  const source = prayer.source ?? sourceStart(rule.source ?? "", OWN_SENTENCES[known.rule] ?? 99);
  return { ref: { rule: known.rule, id: known.id }, entry: known, prayer, source };
}
