import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import de from "@/lib/i18n/messages/de.json";
import { PREMIUM_PLAN_DE } from "@/lib/premium/plans";

/**
 * German has one name for a prayer campaign in everything the app says:
 * "Gebetsaktion", the word the campaigns' own pages have used since July.
 *
 * Until 2026-11-11 four lines said "Gebetskampagne" instead: the free plan's
 * line, and the three notices a creator or a reader is sent (approved, an
 * update, removed). So a reader met "Gebetskampagnen" on the plans page and
 * "Gebetsaktionen" in the Discover menu, two names for one thing. The
 * arbiter's word that day: "one word for campaigns everywhere, the one the
 * campaign pages themselves use".
 *
 * The Privacy page's German said "Gebetskampagne" and "Kampagne" too, 14
 * times in its campaigns paragraphs. That noun was changed the same day, at
 * the arbiter's word (about 15:55 UTC): a translation's word and no change of
 * meaning. The English, which is the text the owner signed, was not touched.
 */

const words = de as Record<string, string>;

describe("German has one name for a prayer campaign", () => {
  it("no line the app says in German calls it a Kampagne", () => {
    const other = Object.keys(words).filter((key) => /kampagne/i.test(words[key]));
    expect(other).toEqual([]);
  });

  it("the campaigns' own pages say Gebetsaktion, and so do the plan's line, the Discover row and the three notices", () => {
    // The pages' own word, by weight: dozens of lines, not a stray one.
    expect(Object.values(words).filter((line) => line.includes("Gebetsaktion")).length).toBeGreaterThan(50);
    expect(words["premium.free.campaigns"]).toBe("Gebetsaktionen, gemeinsam gebetet");
    expect(words["nav.discoverMenu.campaigns"]).toBe("Gebetsaktionen");
    expect(words["community.campaignApproved"]).toBe("Purify hat deine Gebetsaktion freigegeben");
    expect(words["community.campaignUpdate"]).toBe("Eine Gebetsaktion, für die du betest, hat Neuigkeiten");
    expect(words["community.removedYour.campaign"]).toBe("Wir haben deine Gebetsaktion entfernt: {reason}.");
  });

  it("the Privacy page's German says the same, and its English is as he signed it", () => {
    const page = readFileSync(join(process.cwd(), "components/legal/PrivacyText.tsx"), "utf8");
    const at = page.indexOf("function PrivacyDe() {");
    expect(at).toBeGreaterThan(0);
    const german = page.slice(at);
    expect(german).not.toMatch(/kampagne/i);
    expect(german).toContain('<strong className="font-semibold text-paper">Gebetsaktionen.</strong>');
    expect(german.match(/Gebetsaktion/g)).toHaveLength(14);
    // The English names it as it did: fourteen times in its own five paragraphs, from "Prayer campaigns." on.
    const english = page.slice(0, at);
    const from = english.indexOf('<strong className="font-semibold text-paper">Prayer campaigns.</strong>');
    const to = english.indexOf('<strong className="font-semibold text-paper">Community.</strong>');
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    expect(english.slice(from, to).match(/campaign/gi)).toHaveLength(14);
  });

  it("the plans page, which keeps its own German, says the same", () => {
    expect(PREMIUM_PLAN_DE.freeItems).toContain("Gebetsaktionen, gemeinsam gebetet");
    expect(PREMIUM_PLAN_DE.freeItems.filter((item) => /kampagne/i.test(item))).toEqual([]);
    expect(readFileSync(join(process.cwd(), "lib/premium/plans.ts"), "utf8")).not.toMatch(/kampagne/i);
  });
});
