import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";

/**
 * Changing a campaign's words while it waits (1.9; the notes, section 33).
 *
 * The rule itself, and everything the server holds, is in routes.test.ts
 * ("changing its words while it waits"): only its creator, only before its
 * first read, never while hidden on reports, read as a new campaign is.
 * This file holds the screens to the same rule, and the words.
 *
 * What would go wrong if this broke: a creator offered a change the server
 * will refuse; a sheet that opens with the words of an hour ago and saves
 * them over what stands now; or a moderator approving words that were
 * changed after they read them, which is the one thing the rule exists to
 * prevent.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("the server's rule", () => {
  const server = read("lib/campaigns/server.ts");

  it("is one function: waiting, for a first read, and not one of July's", () => {
    expect(server).toContain('return row.status === "held" && typeof row.held_reason === "string" && /^new\\b/.test(row.held_reason) && !isJulyRow(row);');
  });

  it("is asked again in the write itself, so a moderator who read it a moment ago has read the words it keeps", () => {
    const write = /\.from\("prayer_campaigns"\)\s*\.update\(\{\s*title: censored\.title[\s\S]*?\.select\("id"\);/.exec(server)?.[0] ?? "";
    expect(write).toContain('.eq("creator_id", user.id)');
    expect(write).toContain('.eq("status", "held")');
    expect(write).toContain('.like("held_reason", "new%")');
    expect(server).toContain("if (!written || written.length === 0) return READ_ALREADY;");
  });

  it("changes three things and no others", () => {
    const write = /\.update\(\{\s*title: censored\.title[\s\S]*?\}\)/.exec(server)?.[0] ?? "";
    const keys = [...write.matchAll(/^\s{6}(\w+):/gm)].map((m) => m[1]);
    expect(keys).toEqual(["title", "subject_name", "details", "held_reason", "updated_at"]);
  });

  it("holds an account to a number of changes an hour", () => {
    expect(server).toContain("if (await rateLimited(`campaign-change-user:${user.id}`, 3600, CHANGES_AN_HOUR)) {");
    expect(server).toMatch(/export const CHANGES_AN_HOUR = 20;/);
  });

  it("tells its creator alone that the words can be changed, by the same rule", () => {
    expect(server).toContain("...(mine && mayChange(row) ? { changeable: true } : {}),");
  });
});

describe("the screens", () => {
  const page = read("components/campaigns/CampaignPage.tsx");
  const sheet = read("components/campaigns/CampaignChangeSheet.tsx");

  it("offer the change only where the server says the words can still be changed", () => {
    expect(page).toContain('{campaign.changeable ? <ButtonRow icon={<Pen size={17} />} label={t("campaigns.change")} onClick={() => setSheet("change")} /> : null}');
    expect(page).toContain('{campaign.changeable ? <CampaignChangeSheet open={sheet === "change"} campaign={campaign} onClose={() => setSheet(null)} onDone={changed} /> : null}');
  });

  it("read the campaign again once it is saved, so the page shows what the server holds", () => {
    const changed = /function changed\(message: string\) \{[\s\S]*?\n  \}/.exec(page)?.[0] ?? "";
    expect(changed).toContain("void fetchCampaign(campaign.id).then(");
    expect(changed).toContain("setCampaign(again.campaign)");
  });

  it("begin from the campaign as it stands each time the sheet opens", () => {
    // The form is the sheet's child and keeps its own state: it is made anew when the sheet opens.
    expect(sheet).toMatch(/<Sheet open=\{open\}[^>]*>\s*<ChangeForm campaign=\{campaign\} onDone=\{onDone\} \/>\s*<\/Sheet>/);
    expect(sheet).toContain("const [title, setTitle] = useState(campaign.title);");
  });

  it("send nothing when nothing was changed, and nothing without a title and a name", () => {
    expect(sheet).toContain("const ready = title.trim().length >= TITLE_MIN && name.trim().length > 0 && !same && !busy;");
    expect(sheet).toContain("if (!ready) return;");
  });

  it("say why when a moderator has read it in the meantime, and ask first about a masked word", () => {
    expect(sheet).toMatch(/res\.code === "not_waiting"\) \{\s*setError\(t\("campaigns\.change\.late"\)\);/);
    expect(sheet).toMatch(/res\.code === "filtered"\) \{\s*setAskFiltered\(true\);/);
    expect(sheet).toContain("onConfirm={() => void save(true)}");
  });

  it("take the writer's own direction in each field, held to a campaign's own lengths", () => {
    for (const [id, max] of [["campaign-change-title", "TITLE_MAX"], ["campaign-change-name", "NAME_MAX"]] as const) {
      const field = new RegExp(`<input dir="auto" id="${id}"[^\\n]*/>`).exec(sheet)?.[0] ?? "";
      expect(field, id).toContain(`maxLength={${max}}`);
    }
    const area = /<textarea\s+dir="auto"\s+id="campaign-change-words"[\s\S]*?\/>/.exec(sheet)?.[0] ?? "";
    expect(area).toContain("maxLength={WORDS_MAX}");
  });

  it("have their words in the catalog, with no em dash", () => {
    const words = en as Record<string, string>;
    for (const key of ["campaigns.change", "campaigns.change.note", "campaigns.change.saved", "campaigns.change.late"]) {
      expect(words[key], key).toBeTruthy();
      expect(words[key], key).not.toMatch(/[\u2013\u2014]/);
    }
    // The note says what can be done once a moderator has read it.
    expect(words["campaigns.change.note"]).toMatch(/write an update, or end it and run it again/);
  });
});
