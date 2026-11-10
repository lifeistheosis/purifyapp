// The words of the psalms a campaign may carry (lib/campaigns/model.ts,
// CAMPAIGN_PSALMS), read from the prayer book's own files and never copied:
// a correction to a psalm there reaches every campaign that names it.
//
// The two files are brought into the app's code here and nowhere a page
// loads by itself. A screen that needs a psalm's words asks for this file
// when it needs them (loadCampaignPsalm), so the prayer reader, a campaign's
// page and the board carry none of it until a campaign with a psalm is on
// the screen. It travels inside the apps, so it is prayed offline.
//
// English, as the apps carry every prayer.

import protection from "@/data/prayers/rules/protection.json";
import repentance from "@/data/prayers/rules/repentance.json";
import type { Prayer, Rule } from "@/lib/prayers/types";

import { campaignPsalm, type PrayerRef } from "./model";

const FILES: Record<string, Rule> = {
  protection: protection as Rule,
  repentance: repentance as Rule,
};

/** A psalm as a step of a prayer: its own words, and the printing its rule names. */
export type CampaignPsalm = { ref: PrayerRef; number: number; prayer: Prayer; source: string };

/**
 * How much of a rule's own source line speaks of its psalms. A rule names its
 * printings in one line for everything it holds, and a campaign carries one
 * psalm out of it: under that psalm stand the rule's own words about the
 * psalms, as written, and not its words about its other prayers. Nothing is
 * written here: the line is cut, never rephrased (docs/editorial-standards.md,
 * item 28), and lib/campaigns/__tests__/model.test.ts holds each to being the
 * start of its rule's own line.
 *
 *   protection   "Psalms from Brenton's public-domain Septuagint." Then the
 *                petitions' printings, which are not the psalm's.
 *   repentance   The whole line: it is all about Psalm 50.
 */
const PSALM_SENTENCES: Record<string, number> = { protection: 1, repentance: 2 };

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

export function campaignPsalmText(ref: { rule?: unknown; id?: unknown } | null | undefined): CampaignPsalm | null {
  const known = campaignPsalm(ref);
  if (!known) return null;
  const rule = FILES[known.rule];
  const prayer = rule?.prayers.find((p) => p.id === known.id);
  if (!rule || !prayer || !prayer.text) return null;
  const source = prayer.source ?? sourceStart(rule.source ?? "", PSALM_SENTENCES[known.rule] ?? 99);
  return { ref: { rule: known.rule, id: known.id }, number: known.number, prayer, source };
}
