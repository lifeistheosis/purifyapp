// One word for a prayer campaign in each catalog (1.9, the arbiter's of
// 2026-11-10 11:45 UTC: "Russian names 'campaign' three ways in the catalog
// and Serbian two: settle each on the word the campaigns' phase 1 uses").
// The campaigns chat found it (docs/1.9-build/notes/campaigns-fable.md, 13.7
// and 14.1): Russian said кампания, просьба and призыв, and Serbian кампања
// and акција. Phase 1's own lines (4dd15000, a81bd525) say просьба in Russian
// and кампања in Serbian, so every line does now.
//
// What this holds: in each catalog named here, no line names the feature with
// one of the words it replaced, and the feature's own names (the menu, the
// community's heading, the profile's tab, a reader's list, the moderators'
// label) say phase 1's word. The words are matched at a word's start, so the
// Russian and Serbian for the editors (редакция, редакција) are not counted.
//
// What it does not hold: lines that speak of a campaign without naming it
// ("No one is asking for a campaign right now" is "no one is asking for
// prayer" in Russian), which are right as they are.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const catalog = (code: string) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, `lib/i18n/messages/${code}.json`), "utf8")) as Record<string, string>;

/** Each catalog's word as phase 1 says it, and the words it replaced. */
const WORD: Record<string, { word: RegExp; not: RegExp }> = {
  ru: { word: /(?<![\p{L}])просьб/iu, not: /(?<![\p{L}])(кампани|призыв)/iu },
  sr: { word: /(?<![\p{L}])кампањ/iu, not: /(?<![\p{L}])акциј/iu },
};

/** The feature's own names, each of which says the word. */
const NAMES = ["nav.discoverMenu.campaigns", "community.prayerCampaigns", "profile.tabCampaigns", "campaigns.mine.title", "mod.campaign"];

describe("a prayer campaign's name", () => {
  for (const [code, { word, not }] of Object.entries(WORD)) {
    it(`is one word in ${code}, phase 1's`, () => {
      const words = catalog(code);
      const other = Object.entries(words)
        .filter(([, line]) => typeof line === "string" && not.test(line))
        .map(([key, line]) => `${key}: ${line}`);
      // A line that names the feature another way: phase 1's word instead.
      expect(other).toEqual([]);
      for (const key of NAMES) expect(words[key], `${code}: ${key}`).toMatch(word);
    });
  }
});
