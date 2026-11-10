import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_COLS,
  CAMPAIGN_PSALMS,
  DEFAULT_DAYS,
  KIND_LABEL,
  LENGTHS,
  LENGTH_LABEL,
  LIVING_KINDS,
  MAX_DAYS,
  REPORT_REASONS,
  addDays,
  campaignPsalm,
  consentFits,
  daysBetween,
  endsAtOf,
  isCampaignKind,
  isDay,
  isLength,
  isOver,
  isRunning,
  kindFits,
  lastDayOf,
  publicCampaign,
  startsNow,
} from "@/lib/campaigns/model";
import { campaignPsalmText, sourceStart } from "@/lib/campaigns/psalms";
import { campaignCreateSchema } from "@/lib/security/schemas";
import en from "@/lib/i18n/messages/en.json";
import { RULE_FILES } from "@/lib/prayers/library";

/**
 * Prayer campaigns, reworked: the rules a campaign lives by.
 *
 * What would go wrong if these broke: a campaign that runs past forty days,
 * or ends a day early or late for its own readers; a campaign for the
 * reposed carrying a prayer of ours beside the Church's; a creator's account
 * id or a count of who prays reaching a reader; a psalm named that the
 * prayer book cannot open.
 */

describe("what a campaign is for", () => {
  it("offers the living their eight kinds and the reposed their one", () => {
    expect([...LIVING_KINDS]).toEqual(["healing", "study", "travel", "thanksgiving", "comfort", "guidance", "persecuted", "other"]);
    for (const kind of LIVING_KINDS) {
      expect(kindFits("living", kind)).toBe(true);
      expect(kindFits("departed", kind)).toBe(false);
    }
    expect(kindFits("departed", "departed")).toBe(true);
    expect(kindFits("living", "departed")).toBe(false);
    expect(isCampaignKind("departed")).toBe(true);
    expect(isCampaignKind("money")).toBe(false);
  });

  it("names every kind, length and report reason in words the catalog has", () => {
    const keys = [...Object.values(KIND_LABEL), ...Object.values(LENGTH_LABEL)];
    for (const key of keys) expect(en, key).toHaveProperty([key]);
    expect(REPORT_REASONS).toContain("about_me");
  });
});

describe("its length", () => {
  it("is one to forty days, and no more", () => {
    expect(MAX_DAYS).toBe(40);
    expect([...LENGTHS]).toEqual([1, 7, 30, 40]);
    expect(isLength(1)).toBe(true);
    expect(isLength(40)).toBe(true);
    expect(isLength(41)).toBe(false);
    expect(isLength(0)).toBe(false);
    expect(isLength(7.5)).toBe(false);
    expect(isLength("7")).toBe(false);
  });

  it("begins the reposed on forty days and the living on a week", () => {
    expect(DEFAULT_DAYS).toEqual({ living: 7, departed: 40 });
  });

  it("counts its first day among its days", () => {
    // Forty days from 10 November end on 19 December, as the stills say.
    expect(lastDayOf("2026-11-10", 40)).toBe("2026-12-19");
    expect(lastDayOf("2026-11-10", 1)).toBe("2026-11-10");
    expect(lastDayOf("2026-11-10", 7)).toBe("2026-11-16");
    expect(daysBetween("2026-11-10", "2026-12-19")).toBe(39);
  });

  it("moves across a month, a year and a leap day by the calendar", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    // Across a change of clocks nothing slips: a day is its noon in UTC.
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });

  it("only takes a real day", () => {
    expect(isDay("2026-11-10")).toBe(true);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("2026-13-01")).toBe(false);
    expect(isDay("10/11/2026")).toBe(false);
    expect(isDay(null)).toBe(false);
  });

  it("is over for the server at noon UTC the day after its last day", () => {
    expect(endsAtOf("2026-12-19")).toBe("2026-12-20T12:00:00.000Z");
    const c = { status: "active", ends_at: endsAtOf("2026-12-19") };
    // Its last day is still running in Honolulu when it is the 20th in UTC.
    expect(isRunning(c, Date.parse("2026-12-20T09:00:00Z"))).toBe(true);
    expect(isRunning(c, Date.parse("2026-12-20T12:00:00Z"))).toBe(false);
    expect(isOver(c, Date.parse("2026-12-20T12:00:01Z"))).toBe(true);
  });

  it("takes a first day that is today somewhere, and no other", () => {
    const now = Date.parse("2026-11-10T03:00:00Z");
    expect(startsNow("2026-11-10", now)).toBe(true);
    // Still the 9th in Los Angeles, already the 11th nowhere but near enough to the line.
    expect(startsNow("2026-11-09", now)).toBe(true);
    expect(startsNow("2026-11-11", now)).toBe(true);
    expect(startsNow("2026-11-12", now)).toBe(false);
    expect(startsNow("2026-11-01", now)).toBe(false);
    expect(startsNow("not a day", now)).toBe(false);
  });
});

describe("its state", () => {
  it("runs only while it is active", () => {
    for (const status of ["held", "answered", "memory_eternal", "ended", "removed"]) {
      expect(isRunning({ status, ends_at: null })).toBe(false);
    }
    // A July campaign with no end still runs.
    expect(isRunning({ status: "active", ends_at: null })).toBe(true);
  });

  it("is over once closed or ended, and never while it waits for a moderator", () => {
    expect(isOver({ status: "answered" })).toBe(true);
    expect(isOver({ status: "memory_eternal" })).toBe(true);
    expect(isOver({ status: "ended" })).toBe(true);
    expect(isOver({ status: "held", ends_at: "2020-01-01T12:00:00Z" })).toBe(false);
  });
});

describe("the prayer it places", () => {
  it("is one of the psalms the prayer book holds, each of which opens", () => {
    expect(CAMPAIGN_PSALMS.map((p) => p.number)).toEqual([90, 26, 50]);
    for (const psalm of CAMPAIGN_PSALMS) {
      const rule = RULE_FILES[`rules/${psalm.rule}.json`];
      expect(rule, psalm.rule).toBeDefined();
      const prayer = rule.prayers.find((p) => p.id === psalm.id);
      expect(prayer?.text?.length ?? 0, `${psalm.rule}/${psalm.id}`).toBeGreaterThan(400);
      // The rule says where its words are printed: nothing here is ours.
      expect(rule.source.length).toBeGreaterThan(20);
    }
  });

  it("is nothing a reader could have made up", () => {
    expect(campaignPsalm({ rule: "protection", id: "psalm-90" })).toMatchObject({ number: 90 });
    expect(campaignPsalm({ rule: "protection", id: "psalm-91" })).toBeNull();
    expect(campaignPsalm({ rule: "morning", id: "our-father" })).toBeNull();
    expect(campaignPsalm(null)).toBeNull();
  });
});

describe("the printing a psalm names", () => {
  it("is its rule's own words about its psalms, cut and never rephrased", () => {
    for (const psalm of CAMPAIGN_PSALMS) {
      const rule = RULE_FILES[`rules/${psalm.rule}.json`];
      const found = campaignPsalmText(psalm);
      expect(found, `${psalm.rule}/${psalm.id}`).not.toBeNull();
      // The start of the rule's own line, to the letter.
      expect(rule.source?.startsWith(found!.source), `${psalm.rule}: ${found!.source}`).toBe(true);
      expect(found!.source.length).toBeGreaterThan(20);
      // A whole sentence, not a line broken off part way.
      expect(found!.source.endsWith("."), found!.source).toBe(true);
      // And nothing of the rule's other prayers, which are not the psalm's.
      expect(found!.source).not.toMatch(/petition/i);
    }
    expect(campaignPsalmText({ rule: "protection", id: "psalm-90" })?.source).toBe("Psalms from Brenton's public-domain Septuagint.");
    expect(campaignPsalmText({ rule: "repentance", id: "psalm-50" })?.source).toBe(RULE_FILES["rules/repentance.json"].source);
  });

  it("cuts a line at its sentences, and leaves a shorter line whole", () => {
    expect(sourceStart("One. Two. Three.", 1)).toBe("One.");
    expect(sourceStart("One. Two. Three.", 2)).toBe("One. Two.");
    expect(sourceStart("One. Two. Three.", 9)).toBe("One. Two. Three.");
    expect(sourceStart("One line with no stop", 1)).toBe("One line with no stop");
  });
});

describe("the blessing", () => {
  it("is the family's for the reposed, and never the family's for the living", () => {
    expect(consentFits("departed", "family")).toBe(true);
    expect(consentFits("departed", "self")).toBe(false);
    for (const c of ["self", "blessing", "guardian"] as const) expect(consentFits("living", c)).toBe(true);
    expect(consentFits("living", "family")).toBe(false);
  });
});

describe("what a reader is handed", () => {
  const row = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    creator_id: "11111111-1111-4111-8111-111111111111",
    title: "Forty days for Nicholas",
    intention: "departed",
    for_whom: "departed",
    subject_name: "Nicholas",
    details: "Pray with us for our father.",
    note: null,
    days: 40,
    starts_on: "2026-11-10",
    ends_on: "2026-12-19",
    ends_at: "2026-12-20T12:00:00.000Z",
    prayer_rule: null,
    prayer_id: null,
    status: "active",
    creator_name: "Anna",
    creator_handle: "anna",
    created_at: "2026-11-10T03:00:00.000Z",
    praying_count: 12,
    prayer_count: 300,
    held_reason: "new",
    removed_by_email: "team@example.com",
    consent_kind: "family",
    audience: "public",
  };

  it("never carries the creator's account id or a count of anyone", () => {
    const shown = publicCampaign(row);
    expect(Object.keys(shown).sort()).toEqual(
      [
        "created_at", "creator_handle", "creator_name", "days", "details", "ends_at", "ends_on", "for_whom", "id",
        "intention", "prayer_id", "prayer_rule", "starts_on", "status", "subject_name", "title",
      ].sort(),
    );
    const text = JSON.stringify(shown);
    expect(text).not.toContain(row.creator_id);
    expect(text).not.toContain("team@example.com");
    expect(text).not.toMatch(/praying_count|prayer_count|held_reason|consent/);
  });

  it("names no column of the account or of a count in what a read may select", () => {
    const cols = CAMPAIGN_COLS.split(",").map((c) => c.trim());
    for (const banned of ["creator_id", "praying_count", "prayer_count", "removed_by_email", "consent_kind", "image_url"]) {
      expect(cols).not.toContain(banned);
    }
  });

  it("reads a July row as it was: its one line as its words, no days, no creator", () => {
    const july = publicCampaign({ id: "x", title: "For Maria", intention: "healing", for_whom: "living", subject_name: "Maria", note: "She is ill.", status: "active", created_at: "2026-07-20T00:00:00Z" });
    expect(july).toMatchObject({ details: "She is ill.", days: null, starts_on: null, ends_on: null, creator_name: null, prayer_rule: null });
  });

  it("hands on only a prayer the book is known to hold", () => {
    expect(publicCampaign({ ...row, prayer_rule: "protection", prayer_id: "psalm-90" })).toMatchObject({ prayer_rule: "protection", prayer_id: "psalm-90" });
    expect(publicCampaign({ ...row, prayer_rule: "ours", prayer_id: "for-the-sick" })).toMatchObject({ prayer_rule: null, prayer_id: null });
  });
});

describe("a request to start one", () => {
  const good = {
    forWhom: "departed",
    kind: "departed",
    title: "Forty days for Nicholas",
    name: "Nicholas",
    words: "Pray with us for our father.",
    days: 40,
    startsOn: "2026-11-10",
    consent: "family",
    blessing: true,
    rules: true,
  };
  const parse = (over: Record<string, unknown>) => campaignCreateSchema.safeParse({ ...good, ...over }).success;

  it("is taken when it is whole", () => {
    expect(parse({})).toBe(true);
    expect(parse({ forWhom: "living", kind: "healing", consent: "blessing", days: 7, prayer: { rule: "protection", id: "psalm-90" } })).toBe(true);
  });

  it("is refused without the blessing ticked or the rules agreed", () => {
    expect(parse({ blessing: false })).toBe(false);
    expect(parse({ rules: undefined })).toBe(false);
  });

  it("is refused past forty days, or with no day at all", () => {
    expect(parse({ days: 41 })).toBe(false);
    expect(parse({ days: 0 })).toBe(false);
    expect(parse({ startsOn: "today" })).toBe(false);
  });

  it("holds the kind, the blessing and the prayer to whom it is for", () => {
    expect(parse({ kind: "healing" })).toBe(false);
    expect(parse({ consent: "self" })).toBe(false);
    expect(parse({ prayer: { rule: "protection", id: "psalm-90" } })).toBe(false);
    expect(parse({ forWhom: "living", kind: "departed", consent: "self" })).toBe(false);
    expect(parse({ forWhom: "living", kind: "study", consent: "family" })).toBe(false);
  });

  it("holds the name and the words to their lengths", () => {
    expect(parse({ name: "" })).toBe(false);
    expect(parse({ name: "N".repeat(81) })).toBe(false);
    expect(parse({ words: "w".repeat(601) })).toBe(false);
    expect(parse({ title: "ab" })).toBe(false);
  });
});
