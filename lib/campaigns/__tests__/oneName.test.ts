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
 * The Privacy page's German is not held here. It says "Gebetskampagne", it
 * is a text the owner signed, and changing it is his to say.
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

  it("the plans page, which keeps its own German, says the same", () => {
    expect(PREMIUM_PLAN_DE.freeItems).toContain("Gebetsaktionen, gemeinsam gebetet");
    expect(PREMIUM_PLAN_DE.freeItems.filter((item) => /kampagne/i.test(item))).toEqual([]);
    expect(readFileSync(join(process.cwd(), "lib/premium/plans.ts"), "utf8")).not.toMatch(/kampagne/i);
  });
});
