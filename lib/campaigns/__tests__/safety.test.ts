import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DANGER_HOLD_DETAIL, DANGER_MARK, HELPLINES_SITE, HELPLINES_URL, dangerFirst, maySpeakOfDanger, saysDanger, withDangerMark } from "@/lib/campaigns/safety";
import en from "@/lib/i18n/messages/en.json";

/**
 * The safety line (lib/campaigns/safety.ts, components/campaigns/SafetyLine.tsx;
 * his item 129, answered 2026-11-10).
 *
 * What would go wrong if these broke: a reader who writes that they do not
 * want to live is told nothing and is read last; a wrong emergency number,
 * or none, in a reader's own language; the line shown to the wrong person,
 * so that a campaign's readers learn that its writer's words were marked;
 * a hold on such words filed where a moderator reads it as spam.
 */

const source = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("the words that may mean danger", () => {
  it("are read in a campaign, an update or a comment", () => {
    for (const words of [
      "I want to die.",
      "I don't want to live any more. Pray for me.",
      "I do not want to be alive",
      "He told me he wants to kill himself, and I said I would kill myself too", // the second half
      "Sometimes I think I should just kill myself",
      "I am going to end my life",
      "she tried to take my own life... I mean, I did",
      "thoughts of suicide",
      "My brother is suicidal",
      "Pray for the family of a man who died by suicide",
      "He has begun to self-harm",
      "self harm",
      "SELFHARM",
    ]) {
      expect(maySpeakOfDanger([words]), words).toBe(true);
    }
    // In any of the fields it is given, and across them.
    expect(maySpeakOfDanger(["For Maria", null, "I want to die"])).toBe(true);
  });

  it("are not found in the ordinary words of a grief or an illness", () => {
    for (const words of [
      "She is dying of cancer. Please pray.",
      "Our father fell asleep in the Lord on Sunday.",
      "He died last week.",
      "Pray that the tumour is killed by the treatment.",
      "Life is hard for her just now.",
      "I want to live for my children.",
      "He does not want to be alone.",
      "For Peter's exams",
      "",
    ]) {
      expect(maySpeakOfDanger([words]), words).toBe(false);
    }
    expect(maySpeakOfDanger([])).toBe(false);
    expect(maySpeakOfDanger([null, undefined])).toBe(false);
  });

  it("read English alone, which the file says plainly", () => {
    expect(maySpeakOfDanger(["Je ne veux plus vivre."])).toBe(false);
    expect(source("lib/campaigns/safety.ts").replace(/\n\/\/ ?/g, " ")).toMatch(/reads English alone/);
  });
});

describe("the mark a moderator reads first", () => {
  it("stands before whatever else held a note, and alone when nothing else did", () => {
    expect(DANGER_MARK).toBe("crisis");
    expect(withDangerMark(null)).toBe(DANGER_HOLD_DETAIL);
    expect(withDangerMark("")).toBe(DANGER_HOLD_DETAIL);
    expect(DANGER_HOLD_DETAIL).toBe("crisis: the writer may be in danger");
    expect(withDangerMark("first words from a new account")).toBe("crisis; first words from a new account");
    expect(withDangerMark("x".repeat(400)).length).toBeLessThanOrEqual(300);
  });

  it("is read from a note's hold and from a campaign's reasons, and from nothing a reader could write there", () => {
    for (const detail of [DANGER_HOLD_DETAIL, "crisis; first words from a new account", "new; crisis", "new; crisis; words (2 masked); money"]) {
      expect(saysDanger(detail), detail).toBe(true);
    }
    for (const detail of [null, undefined, "", "new", "money asked under a prayer campaign", "Blocked link: crisis.example.com", "Reads like spam: crisis line, phone", "new; words (1 masked)", "crisisline"]) {
      expect(saysDanger(detail), String(detail)).toBe(false);
    }
  });

  it("puts those holds first, each group in the order it came", () => {
    const holds = [
      { id: "a", detail: "first words from a new account" },
      { id: "b", detail: DANGER_HOLD_DETAIL },
      { id: "c", detail: null },
      { id: "d", detail: "crisis; first words from a new account" },
      { id: "e" },
    ];
    expect(dangerFirst(holds).map((h) => h.id)).toEqual(["b", "d", "a", "c", "e"]);
    // Nothing is lost, and the list handed in is left as it was.
    expect(holds.map((h) => h.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(dangerFirst([])).toEqual([]);
  });

  it("is what the moderators' page draws: the mark for such a hold, in place of the reason it is filed under", () => {
    const page = source("components/community/moderation/ModerationClient.tsx");
    expect(page).toContain("dangerFirst(queue.holds).map(");
    expect(page).toContain("const danger = saysDanger(hold.detail);");
    expect(page).toContain('{danger ? <Chip className={DANGER_TONE}>{t("mod.campaignCrisis")}</Chip> : <Chip className={REASON_TONE[hold.reason]}>');
    expect((en as Record<string, string>)["mod.campaignCrisis"]).toBe("Read first: the writer may be in danger");
  });
});

describe("the line, as he approved it", () => {
  const LINE = "If you or someone else is in danger right now, call your local emergency number (911 in the United States, 112 in the European Union). In the United States you can call or text 988 at any hour. Elsewhere, findahelpline.com lists helplines by country.";

  it("is his words to the letter in English", () => {
    expect((en as Record<string, string>)["campaigns.safety.line"]).toBe(LINE);
    expect((en as Record<string, string>)["campaigns.safety.first"]).toBe("A moderator will read your words first.");
  });

  it("carries the three numbers and the site, each once and as they are dialled, in every language", () => {
    const dir = join(process.cwd(), "lib/i18n/messages");
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(files).toHaveLength(21);
    for (const file of files) {
      const catalog = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, string>;
      const line = catalog["campaigns.safety.line"];
      const first = catalog["campaigns.safety.first"];
      expect(typeof line, file).toBe("string");
      expect(first?.length ?? 0, file).toBeGreaterThan(10);
      // The numbers in the digits a phone dials, whatever digits the language writes elsewhere.
      for (const number of ["911", "112", "988"]) {
        expect(line.split(number).length - 1, `${file} ${number}`).toBe(1);
      }
      // No other number is in it: nothing a reader could dial by mistake.
      expect((line.match(/[0-9٠-٩۰-۹०-९]+/g) ?? []).sort(), file).toEqual(["112", "911", "988"]);
      expect(line.split(HELPLINES_SITE).length - 1, file).toBe(1);
      // No em dash, by his rule for anything a reader sees.
      expect(`${line}${first}`, file).not.toMatch(/[—–]/);
      // Two full sentences and a third: a line cut short would lose a number.
      expect(line.length, file).toBeGreaterThan(150);
    }
  });

  it("opens the site it names, and no number is a button", () => {
    expect(HELPLINES_SITE).toBe("findahelpline.com");
    expect(HELPLINES_URL).toBe("https://findahelpline.com");
    const drawn = source("components/campaigns/SafetyLine.tsx");
    expect(drawn).toContain('<a href={HELPLINES_URL} target="_blank" rel="noopener noreferrer"');
    // The only thing to tap is the site: no tel: link, so no emergency line is called by a slip of the thumb.
    expect(drawn).not.toMatch(/tel:/);
    expect(drawn.match(/<a /g)).toHaveLength(1);
    expect(drawn).not.toMatch(/<button/);
    // A line that has lost the site's name is shown as it is.
    expect(drawn).toContain("const at = line.indexOf(HELPLINES_SITE);");
  });
});

describe("who is told", () => {
  it("only a campaign's own creator, and only while it waits with that reason: asked in the one place a campaign is handed to a reader", () => {
    const server = source("lib/campaigns/server.ts");
    expect(server).toContain('...(mine && row.status === "held" && typeof row.held_reason === "string" && saysDanger(row.held_reason) ? { safety: true } : {}),');
    // Nothing else in the server writes it, and what the board and every list are made from has no such field.
    expect(server.match(/safety: true/g)).toHaveLength(1);
    const model = source("lib/campaigns/model.ts");
    const made = model.slice(model.indexOf("export function publicCampaign("), model.indexOf("// ── Parts that ship switched off"));
    expect(made).not.toMatch(/safety|held_reason/);
  });

  it("a note's writer, in the answer to their own words and nowhere else", () => {
    const route = source("app/api/campaigns/[id]/thread/route.ts");
    expect(route.match(/safety/g)?.length).toBeGreaterThan(0);
    expect(route).toContain("safety: wrote.safety");
    // What a thread's readers are handed says nothing of it.
    const thread = source("lib/campaigns/thread.ts");
    const read = thread.slice(thread.indexOf("function publicNote("), thread.indexOf("export type Wrote"));
    expect(read).not.toMatch(/safety|danger/i);
  });
});

describe("where it is shown", () => {
  it("always: at the foot of the rules page and of the start screen", () => {
    expect(source("components/campaigns/CampaignRules.tsx")).toMatch(/<SafetyLine className="[^"]*" \/>/);
    expect(source("components/campaigns/StartCampaign.tsx")).toMatch(/<SafetyLine className="[^"]*" \/>/);
    // Neither of those says "a moderator will read your words first": nothing was written yet.
    expect(source("components/campaigns/CampaignRules.tsx")).not.toMatch(/<SafetyLine first/);
    expect(source("components/campaigns/StartCampaign.tsx")).not.toMatch(/<SafetyLine first/);
  });

  it("at once, to the writer alone: on their waiting campaign, and under the field they wrote in", () => {
    const page = source("components/campaigns/CampaignPage.tsx");
    expect(page).toContain('{campaign.status === "held" && campaign.safety ? <SafetyLine first className="mb-6" /> : null}');
    const notes = source("components/campaigns/CampaignNotes.tsx");
    expect(notes).toContain("setSafety(res.safety);");
    expect(notes).toContain("{safety && !failed ? <SafetyLine first");
    // It is cleared before the next thing is sent, so it never stands over other words.
    expect(notes).toContain("setSafety(false);");
    // No list, no card and no row ever draws it: those are what other readers see.
    for (const file of ["CampaignRow.tsx", "CampaignBoard.tsx", "PrayTogetherCampaigns.tsx", "MyCampaigns.tsx", "CampaignModeration.tsx"]) {
      expect(source(`components/campaigns/${file}`), file).not.toMatch(/SafetyLine|\.safety\b/);
    }
    expect(source("components/community/CampaignCard.tsx")).not.toMatch(/SafetyLine|\.safety\b/);
  });
});
