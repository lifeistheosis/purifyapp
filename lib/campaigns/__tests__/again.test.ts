import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { NAME_MAX, TITLE_MAX, WORDS_MAX, mayRunAgain, partsToRunAgain, publicCampaign, type PublicCampaign } from "@/lib/campaigns/model";
import en from "@/lib/i18n/messages/en.json";

/**
 * Run it again (1.9; the notes, 2.2): forty days is the ceiling, and "a need
 * that lasts longer is renewed: 'Run it again' makes a new campaign from the
 * same parts, and nobody is carried over without choosing to be."
 *
 * What this file holds:
 *
 *   whose, and when      only its creator, and only once it is over. Never
 *                        one that waits for a moderator or still runs;
 *   what comes over      what its creator wrote and chose: for whom, the
 *                        kind, the title, the name, the words, the length,
 *                        the prayer, the place, the circle by its name;
 *   what never does      the blessing, the two ticks, and anyone who carried
 *                        it: the start screen asks for the first three again
 *                        and the route makes a new campaign, held for a
 *                        moderator, with no one in it;
 *   never wider          one kept to a circle comes over only with that
 *                        circle still the reader's own.
 *
 * What would go wrong if this broke: a stranger starting a campaign from
 * someone else's words; a blessing given for forty days standing for eighty
 * with nobody asked; or a campaign that was for a parish set out for
 * everyone in Community because its circle could not be found.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const NOW = Date.UTC(2026, 10, 10, 12, 0);
const PAST = new Date(NOW - 86_400_000).toISOString();
const AHEAD = new Date(NOW + 86_400_000).toISOString();

const over = (more: Partial<PublicCampaign> = {}): PublicCampaign => ({
  ...publicCampaign({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    title: "For Maria before her operation",
    intention: "healing",
    for_whom: "living",
    subject_name: "Maria",
    details: "She goes into hospital on Thursday.",
    days: 7,
    starts_on: "2026-11-01",
    ends_on: "2026-11-07",
    ends_at: PAST,
    prayer_rule: "morning",
    prayer_id: "trisagion",
    place_country: "GR",
    place_name: "Thessaloniki",
    status: "active",
    creator_name: "Anna",
    created_at: "2026-11-01T08:00:00.000Z",
  }),
  mine: true,
  ...more,
});

describe("whose it is to run again, and when", () => {
  it("its creator's, once it is over: past its last day, or closed with a closing", () => {
    expect(mayRunAgain(over(), NOW)).toBe(true);
    for (const status of ["ended", "answered", "memory_eternal"] as const) expect(mayRunAgain(over({ status, ends_at: AHEAD }), NOW), status).toBe(true);
  });

  it("never one that still runs, and never one that waits for a moderator", () => {
    expect(mayRunAgain(over({ ends_at: AHEAD }), NOW)).toBe(false);
    expect(mayRunAgain(over({ status: "held" }), NOW)).toBe(false);
    expect(mayRunAgain(over({ status: "held", ends_at: AHEAD }), NOW)).toBe(false);
  });

  it("never anyone else's, over or not", () => {
    expect(mayRunAgain(over({ mine: false }), NOW)).toBe(false);
    expect(mayRunAgain({ ...over(), mine: undefined }, NOW)).toBe(false);
  });

  it("one of July's, which reads as ended to the reader who started it", () => {
    const july = { ...publicCampaign({ id: "x", title: "For Maria", intention: "healing", for_whom: "living", subject_name: "Maria", note: "She is ill.", status: "active", created_at: "2026-07-20T00:00:00.000Z" }), mine: true };
    expect(july.status).toBe("ended");
    expect(mayRunAgain(july, NOW)).toBe(true);
    expect(partsToRunAgain(july)).toMatchObject({ forWhom: "living", kind: "healing", title: "For Maria", name: "Maria", words: "She is ill.", days: null, prayer: null, country: null, town: "", circle: null });
  });
});

describe("what comes over", () => {
  it("what its creator wrote and chose, and nothing else", () => {
    const parts = partsToRunAgain(over());
    expect(parts).toEqual({
      forWhom: "living",
      kind: "healing",
      title: "For Maria before her operation",
      name: "Maria",
      words: "She goes into hospital on Thursday.",
      days: 7,
      prayer: { rule: "morning", id: "trisagion" },
      country: "GR",
      town: "Thessaloniki",
      circle: null,
    });
    // No blessing, no tick, no day, no creator and no id: those are given or made again.
    expect(Object.keys(parts).sort()).toEqual(["circle", "country", "days", "forWhom", "kind", "name", "prayer", "title", "town", "words"]);
  });

  it("for the reposed: no kind and no prayer, as the start screen asks for none", () => {
    const parts = partsToRunAgain(over({ for_whom: "departed", intention: "departed", prayer_rule: "morning", prayer_id: "trisagion", days: 40 }));
    expect(parts).toMatchObject({ forWhom: "departed", kind: null, prayer: null, days: 40 });
  });

  it("only a prayer a campaign may carry, and a town only with its country", () => {
    expect(partsToRunAgain(over({ prayer_rule: "ours", prayer_id: "made-up" })).prayer).toBeNull();
    expect(partsToRunAgain(over({ prayer_rule: null, prayer_id: null })).prayer).toBeNull();
    expect(partsToRunAgain(over({ place_country: null, place_name: "Thessaloniki" }))).toMatchObject({ country: null, town: "" });
    expect(partsToRunAgain(over({ place_name: null }))).toMatchObject({ country: "GR", town: "" });
  });

  it("the circle it was kept to, by its name, for the start screen to find among the reader's own", () => {
    expect(partsToRunAgain(over({ circle: { name: "St Nicholas parish" } })).circle).toBe("St Nicholas parish");
  });

  it("never more than the start screen's own fields take", () => {
    const long = partsToRunAgain(over({ title: "t".repeat(TITLE_MAX + 40), subject_name: "n".repeat(NAME_MAX + 40), details: "w".repeat(WORDS_MAX + 400) }));
    expect([long.title.length, long.name.length, long.words.length]).toEqual([TITLE_MAX, NAME_MAX, WORDS_MAX]);
    expect(partsToRunAgain(over({ subject_name: null, details: null }))).toMatchObject({ name: "", words: "" });
  });
});

describe("the screens", () => {
  const start = read("components/campaigns/StartCampaign.tsx");
  const page = read("components/campaigns/CampaignPage.tsx");
  // The whole of the effect that begins the page from another campaign.
  const effect = /const from = new URLSearchParams\(window\.location\.search\)\.get\("from"\);[\s\S]*?\n  \}, \[\]\);/.exec(start)?.[0] ?? "";

  it("the page offers it where its creator's ended campaign has nothing to add, by the rule and nothing looser", () => {
    expect(page).toContain("const againHref = mayRunAgain(campaign) ? `/campaigns/new?from=${encodeURIComponent(campaign.id)}` : null;");
    expect(page).toMatch(/\) : againHref \? \(\s*\/\/[^\n]*\n\s*<Link href=\{againHref\} data-campaign-again=""/);
  });

  it("the start screen begins from one only by the rule: the reader's own, and over", () => {
    expect(effect).not.toBe("");
    expect(effect).toContain('if (!live || found.state !== "ok" || !mayRunAgain(found.campaign)) return;');
    // Nothing is set before that question is answered.
    expect(effect.indexOf("mayRunAgain(found.campaign)")).toBeLessThan(effect.indexOf("setWhom("));
  });

  it("never carries the blessing or the two ticks: they are given again", () => {
    expect(effect).not.toMatch(/setConsent|setFamily|setRules|setTerms/);
    // And what is sent still needs them: Create is lit by the same rule as for any campaign.
    expect(start).toMatch(/const ready =[\s\S]*?blessed &&\s*rules &&\s*terms &&/);
  });

  it("never sets out for everyone what was kept to a circle: without that circle among the reader's own, nothing comes over", () => {
    const circle = /if \(parts\.circle !== null\) \{[\s\S]*?\n      \}/.exec(effect)?.[0] ?? "";
    expect(circle).toContain("const mine = (await fetchCircles()).circles.filter((c) => c.name === parts.circle);");
    expect(circle).toContain("if (!live || mine.length !== 1) return;");
    // The circle is settled before a single part is set.
    expect(effect.indexOf("if (parts.circle !== null)")).toBeLessThan(effect.indexOf("setWhom("));
    expect(effect).toContain("setCircleId(circle);");
  });

  it("keeps the prayer its creator chose then, the name alone included, through any change of kind", () => {
    expect(effect).toMatch(/setPsalm\(parts\.prayer\);\s*setPrayerByHand\(true\);/);
  });

  it("says once what the page began with, in words that are in the catalog and hold no em dash", () => {
    expect(start).toMatch(/\{again \? \(\s*<p role="status" data-campaign-again=""[^>]*>\s*\{t\("campaigns\.again\.note"\)\}/);
    const words = en as Record<string, string>;
    for (const key of ["campaigns.again", "campaigns.again.note"]) {
      expect(words[key], key).toBeTruthy();
      expect(words[key], key).not.toMatch(/\u2014/);
    }
    expect(words["campaigns.again.note"]).toMatch(/moderator will read it first/);
    expect(words["campaigns.again.note"]).toMatch(/no one is added/);
  });
});
