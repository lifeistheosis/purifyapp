// Pairs and groups read as one man (1.9, found by the arbiter): a page of
// two or more saints, Sts. Cosmas and Damian or the Seven Sleepers, said
// "Open his page", "His web, year by year", "not written by him". Now such a
// page says "their", each line with a key of its own in every catalog
// (lib/saints/pronoun.ts).
//
// What a reader would notice if this broke: a pair or a company of martyrs
// called "he" again, in any of the 21 languages.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";
import { byPronoun } from "@/lib/saints/pronoun";
import { SAINTS } from "@/lib/saints/saints";

const root = join(__dirname, "..", "..", "..");

/** A page of two or more, by its name: "Sts." or "Saints", or a company named as one. */
function namesMore(name: string): boolean {
  return /^(Sts\.|Saints) /.test(name) || /\b(Martyrs|Sleepers|Innocents|Youths|Companions|Women|Fathers)\b/.test(name);
}

/** The lines that name a saint by pronoun, each in its three forms. */
const FORMS = [
  ["saints.hisTitles", "saints.herTitles", "saints.theirTitles"],
  ["saints.hisGreatFeasts", "saints.herGreatFeasts", "saints.theirGreatFeasts"],
  ["saints.inHisOwnWords", "saints.inHerOwnWords", "saints.inTheirOwnWords"],
  ["saints.hisDisciples", "saints.herDisciples", "saints.theirDisciples"],
  ["saints.voice.liturgicalBodyHis", "saints.voice.liturgicalBodyHer", "saints.voice.liturgicalBodyTheir"],
  ["saints.web.openHisPage", "saints.web.openHerPage", "saints.web.openTheirPage"],
  ["saints.web.yearByYearHis", "saints.web.yearByYearHer", "saints.web.yearByYearTheir"],
  ["saints.web.undatedHis", "saints.web.undatedHer", "saints.web.undatedTheir"],
  ["desktop.presence.readHisLife", "desktop.presence.readHerLife", "desktop.presence.readTheirLife"],
  ["desktop.presence.readHisWords", "desktop.presence.readHerWords", "desktop.presence.readTheirWords"],
] as const;

describe("a page of two or more saints says their", () => {
  it("every pair and company is their, and no one saint is", () => {
    const more = SAINTS.filter((s) => namesMore(s.name));
    expect(more.length).toBeGreaterThanOrEqual(35);
    for (const s of more) expect(s.pronoun, `${s.slug}: ${s.name}`).toBe("their");
    for (const s of SAINTS.filter((x) => x.pronoun === "their")) expect(namesMore(s.name), `${s.slug}: ${s.name}`).toBe(true);
    // The pages the arbiter named, and a company led by one saint.
    for (const slug of ["cosmas-and-damian-of-asia", "seven-sleepers-of-ephesus", "sebastian-and-companions", "prophet-daniel"]) {
      expect(SAINTS.find((s) => s.slug === slug)?.pronoun, slug).toBe("their");
    }
  });

  it("each line has its their in every language, written for it", () => {
    const read = (code: string) => JSON.parse(readFileSync(join(root, `lib/i18n/messages/${code}.json`), "utf8")) as Record<string, string>;
    const en = read("en");
    expect(LOCALES.length).toBe(21);
    for (const { code } of LOCALES) {
      const catalog = read(code);
      for (const [his, her, their] of FORMS) {
        expect(catalog[his] && catalog[her], `${code} ${his}`).toBeTruthy();
        expect(catalog[their], `${code} ${their}`).toBeTruthy();
        // Written in the language, never the English held in its place. (It
        // may read as "his" does where the language says them alike: Spanish
        // "su", Turkish "-ları".)
        if (code !== "en") expect(catalog[their], `${code} ${their}`).not.toBe(en[their]);
      }
    }
  });

  it("every line chooses among the three, through byPronoun", () => {
    expect(byPronoun(undefined, { his: 1, her: 2, their: 3 })).toBe(1);
    expect(byPronoun("her", { his: 1, her: 2, their: 3 })).toBe(2);
    expect(byPronoun("their", { his: 1, her: 2, their: 3 })).toBe(3);
    // No line picks between two forms by hand any more: a new one would call
    // a pair "he" again.
    let twoWays = "";
    try {
      twoWays = execFileSync("git", ["grep", "-n", "-E", String.raw`pronoun === "(her|his)"`, "--", "app", "components", "lib", ":(exclude)**/__tests__/**"], { cwd: root, encoding: "utf8" });
    } catch {
      // git grep answers 1 when nothing matches.
    }
    expect(twoWays).toBe("");
  });
});
