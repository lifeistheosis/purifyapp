import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_COLS,
  CAMPAIGN_PRAYERS,
  DEFAULT_DAYS,
  KIND_LABEL,
  KIND_PRAYER,
  LENGTHS,
  LENGTH_LABEL,
  LIVING_KINDS,
  MAX_DAYS,
  REPORT_REASONS,
  addDays,
  campaignPrayer,
  consentFits,
  daysBetween,
  endsAtOf,
  isCampaignKind,
  isDay,
  isJulyRow,
  isLength,
  isOver,
  isRunning,
  kindFits,
  lastDayOf,
  prayerAfterKind,
  publicCampaign,
  startsNow,
} from "@/lib/campaigns/model";
import { campaignPrayerText, psalterText, sourceStart } from "@/lib/campaigns/prayerTexts";
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
    // A July campaign with no end still runs, by its dates alone. The rework
    // runs none of July's all the same: see "July's rows" below.
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
  /** A psalm as the Bible's own file holds it. */
  const bible = (n: number) => JSON.parse(readFileSync(join(process.cwd(), `data/bible/psalms/${n}.json`), "utf8")) as { book: string; chapter: number; source: string; verses: { n: number; text: string }[] };

  it("is one of eight the app holds: the Trisagion prayers, then seven psalms by their number", () => {
    expect(CAMPAIGN_PRAYERS.map((p) => p.number ?? p.title)).toEqual(["onboard.day1.trisagion.title", 24, 26, 50, 90, 102, 120, 142]);
    // No pointer twice, and each of a shape the table's own check takes.
    expect(new Set(CAMPAIGN_PRAYERS.map((p) => `${p.rule}/${p.id}`)).size).toBe(CAMPAIGN_PRAYERS.length);
    for (const p of CAMPAIGN_PRAYERS) expect(`${p.rule} ${p.id}`).toMatch(/^[a-z0-9-]{1,80} [a-z0-9-]{1,80}$/);
    // Each is named by a line the catalog already has.
    expect((en as Record<string, string>)["onboard.day1.trisagion.title"]).toBe("The Trisagion Prayers");
    expect((en as Record<string, string>)["today.greet.psalm"]).toContain("{ref}");
  });

  it("each opens from the app's own file, word for word", () => {
    for (const p of CAMPAIGN_PRAYERS) {
      const found = campaignPrayerText(p);
      expect(found, `${p.rule}/${p.id}`).not.toBeNull();
      expect(found!.prayer.text?.length ?? 0, `${p.rule}/${p.id}`).toBeGreaterThan(300);
      expect(found!.entry).toBe(p);
      if (p.rule === "psalter") {
        // The Bible's file of that psalm, and no other: Brenton's, a verse a line, nothing added.
        const file = bible(p.number!);
        expect([file.book, file.chapter, file.source]).toEqual(["psalms", p.number, "brenton-lxx-pd"]);
        expect(found!.prayer.text).toBe(file.verses.map((v) => v.text).join("\n"));
        expect(found!.prayer.title).toBe(`Psalm ${p.number}`);
      } else {
        const rule = RULE_FILES[`rules/${p.rule}.json`];
        expect(rule, p.rule).toBeDefined();
        expect(found!.prayer.text).toBe(rule.prayers.find((x) => x.id === p.id)?.text);
        // The rule says where its words are printed: nothing here is ours.
        expect(rule.source.length).toBeGreaterThan(20);
      }
    }
  });

  it("a psalm set from the Bible's file is set as the prayer book sets one", () => {
    // Psalms 90 and 26 stand in both. The prayer book's copy and the Bible's
    // file are the same words, a verse a line: so the four read from the
    // Bible are the Psalter the prayer book prints its own psalms from.
    for (const n of [90, 26]) {
      const book = RULE_FILES["rules/protection.json"].prayers.find((p) => p.id === `psalm-${n}`);
      expect(bible(n).verses.map((v) => v.text).join("\n"), `Psalm ${n}`).toBe(book?.text);
    }
  });

  it("reads a psalm only from a file that is that psalm, in Brenton's text", () => {
    const file = bible(120);
    expect(psalterText(file, 120)).toBe(file.verses.map((v) => v.text).join("\n"));
    // Another psalm's file, another book's, another text's, and no file at all:
    // none is shown under Brenton's name.
    expect(psalterText(file, 121)).toBeNull();
    expect(psalterText({ ...file, book: "proverbs" }, 120)).toBeNull();
    expect(psalterText({ ...file, source: "kjv" }, 120)).toBeNull();
    expect(psalterText({ ...file, verses: [] }, 120)).toBeNull();
    expect(psalterText(undefined, 120)).toBeNull();
  });

  it("is nothing a reader could have made up", () => {
    expect(campaignPrayer({ rule: "protection", id: "psalm-90" })).toMatchObject({ number: 90 });
    expect(campaignPrayer({ rule: "morning", id: "trisagion" })).toMatchObject({ title: "onboard.day1.trisagion.title" });
    expect(campaignPrayer({ rule: "protection", id: "psalm-91" })).toBeNull();
    expect(campaignPrayer({ rule: "morning", id: "our-father" })).toBeNull();
    // A psalm of the Bible's that is not on the list, and one the prayer book holds under its own rule.
    expect(campaignPrayer({ rule: "psalter", id: "psalm-1" })).toBeNull();
    expect(campaignPrayer({ rule: "psalter", id: "psalm-90" })).toBeNull();
    expect(campaignPrayerText({ rule: "psalter", id: "psalm-23" })).toBeNull();
    expect(campaignPrayer(null)).toBeNull();
  });
});

describe("the prayer each kind starts with", () => {
  it("is his mapping: six kinds with a prayer of the list, two with the name alone", () => {
    expect(KIND_PRAYER).toEqual({
      healing: { rule: "morning", id: "trisagion" },
      comfort: { rule: "protection", id: "psalm-90" },
      persecuted: { rule: "protection", id: "psalm-26" },
      guidance: { rule: "psalter", id: "psalm-142" },
      travel: { rule: "psalter", id: "psalm-120" },
      thanksgiving: { rule: "psalter", id: "psalm-102" },
      study: null,
      other: null,
    });
    // Every kind of the living has its answer, and each prayer named is on the list.
    expect(Object.keys(KIND_PRAYER).sort()).toEqual([...LIVING_KINDS].sort());
    for (const ref of Object.values(KIND_PRAYER)) if (ref) expect(campaignPrayer(ref), JSON.stringify(ref)).not.toBeNull();
    // The reposed have the Church's own prayer, and no pointer of this kind.
    expect("departed" in KIND_PRAYER).toBe(false);
  });

  it("each is there for words of its own that ask what the campaign asks, as its file has them", () => {
    // The lines put to him with the mapping (the notes, 22.2), each read from the app's file.
    const WORDS: Record<string, string[]> = {
      healing: ["Holy God, visit and heal our infirmities, for Thy Name's sake."],
      comfort: ["I am with him in affliction; and I will deliver him"],
      persecuted: ["my persecutors and mine enemies, they fainted and fell"],
      guidance: ["Teach me to do thy will", "thy good Spirit shall guide me in the straight way."],
      travel: ["The Lord shall keep thy coming in, and thy going out"],
      thanksgiving: ["Bless the Lord, O my soul, and forget not all his praises"],
    };
    for (const [kind, lines] of Object.entries(WORDS)) {
      const text = campaignPrayerText(KIND_PRAYER[kind as keyof typeof KIND_PRAYER])?.prayer.text ?? "";
      for (const line of lines) expect(text, `${kind}: ${line}`).toContain(line);
    }
    // And the psalm offered for studies, which no kind starts with.
    expect(campaignPrayerText({ rule: "psalter", id: "psalm-24" })?.prayer.text).toContain("Shew me thy ways, O Lord; and teach me thy paths.");
  });
});

describe("the prayer the start screen holds when a kind is chosen", () => {
  it("is the kind's own until the creator has chosen one themselves, and theirs from then on", () => {
    // Nothing chosen by hand: each kind brings its own, and a later kind takes the earlier one's place.
    expect(prayerAfterKind("travel", null, false)).toEqual({ rule: "psalter", id: "psalm-120" });
    expect(prayerAfterKind("healing", { rule: "psalter", id: "psalm-120" }, false)).toEqual({ rule: "morning", id: "trisagion" });
    // A kind with the name alone clears what an earlier kind had set.
    expect(prayerAfterKind("study", { rule: "morning", id: "trisagion" }, false)).toBeNull();
    // Chosen by hand: it stays through every change of kind.
    const own = { rule: "repentance", id: "psalm-50" };
    for (const kind of LIVING_KINDS) expect(prayerAfterKind(kind, own, true)).toBe(own);
    // The name alone, chosen by hand, stays too.
    for (const kind of LIVING_KINDS) expect(prayerAfterKind(kind, null, true)).toBeNull();
  });

  it("is wired so on the start screen: a kind sets it through that rule, and the prayer's own sheet marks it chosen", () => {
    const screen = readFileSync(join(process.cwd(), "components/campaigns/StartCampaign.tsx"), "utf8");
    expect(screen).toContain("setPsalm(prayerAfterKind(k, psalm, prayerByHand));");
    // The two places a prayer is the creator's own choice say so, and no other place does: the
    // prayer's own sheet, and Run it again, which brings the prayer they chose last time (again.test.ts).
    expect(screen.match(/setPrayerByHand\(true\)/g)?.length).toBe(2);
    const sheet = screen.slice(screen.indexOf('open={opened === "psalm"}'));
    expect(sheet.slice(0, sheet.indexOf("</Sheet>"))).toContain("setPrayerByHand(true);");
    const again = screen.slice(screen.indexOf('.get("from")'));
    expect(again.slice(0, again.indexOf("const leave ="))).toMatch(/setPsalm\(parts\.prayer\);\s*setPrayerByHand\(true\);/);
    // And the row is named by the line the campaign's page already has for it.
    expect(screen).toContain('label={t("campaigns.thePrayer")}');
    expect(screen).not.toContain("campaigns.new.psalm\"");
  });
});

describe("the printing a prayer names", () => {
  it("is its file's own words about it, cut and never rephrased", () => {
    for (const p of CAMPAIGN_PRAYERS) {
      // A psalm from the Bible's file is named in the prayer book's own words for the same Psalter.
      const rule = RULE_FILES[`rules/${p.rule === "psalter" ? "protection" : p.rule}.json`];
      const found = campaignPrayerText(p);
      expect(found, `${p.rule}/${p.id}`).not.toBeNull();
      // The start of the rule's own line, to the letter.
      expect(rule.source?.startsWith(found!.source), `${p.rule}: ${found!.source}`).toBe(true);
      expect(found!.source.length).toBeGreaterThan(20);
      // A whole sentence, not a line broken off part way.
      expect(found!.source.endsWith("."), found!.source).toBe(true);
      // And for a psalm, nothing of the rule's other prayers, which are not the psalm's.
      if (p.number !== undefined) expect(found!.source).not.toMatch(/petition/i);
    }
    const BRENTON = "Psalms from Brenton's public-domain Septuagint.";
    expect(campaignPrayerText({ rule: "protection", id: "psalm-90" })?.source).toBe(BRENTON);
    expect(campaignPrayerText({ rule: "psalter", id: "psalm-142" })?.source).toBe(BRENTON);
    expect(campaignPrayerText({ rule: "repentance", id: "psalm-50" })?.source).toBe(RULE_FILES["rules/repentance.json"].source);
    expect(campaignPrayerText({ rule: "morning", id: "trisagion" })?.source).toBe(RULE_FILES["rules/morning.json"].source);
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
        "intention", "place_country", "place_name", "prayer_id", "prayer_rule", "starts_on", "status", "subject_name", "title",
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

  it("July's rows: one with no length runs for nobody, and reads as ended to the reader who started it", () => {
    const july = { id: "x", title: "For Maria", intention: "healing", for_whom: "living", subject_name: "Maria", status: "active", created_at: "2026-07-20T00:00:00Z" };
    expect(isJulyRow(july)).toBe(true);
    expect(isJulyRow({ ...july, days: null })).toBe(true);
    expect(isJulyRow({ ...july, days: 7 })).toBe(false);
    expect(publicCampaign(july).status).toBe("ended");
    // Its closings are kept as they were said, and a campaign with a length is untouched.
    expect(publicCampaign({ ...july, status: "answered" }).status).toBe("answered");
    expect(publicCampaign({ ...july, status: "memory_eternal" }).status).toBe("memory_eternal");
    expect(publicCampaign({ ...row, status: "active" }).status).toBe("active");
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
    termsAccepted: true,
  };
  const parse = (over: Record<string, unknown>) => campaignCreateSchema.safeParse({ ...good, ...over }).success;

  it("is taken when it is whole", () => {
    expect(parse({})).toBe(true);
    expect(parse({ forWhom: "living", kind: "healing", consent: "blessing", days: 7, prayer: { rule: "protection", id: "psalm-90" } })).toBe(true);
  });

  it("is refused without the blessing ticked, the rules agreed or the Terms of Service accepted", () => {
    expect(parse({ blessing: false })).toBe(false);
    expect(parse({ rules: undefined })).toBe(false);
    expect(parse({ termsAccepted: undefined })).toBe(false);
    expect(parse({ termsAccepted: false })).toBe(false);
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
