// Under every saint's life, one line in the reader's language and a link
// that writes to support (1.9, call 24, the owner's yes of 2026-11-11:
// "Suggest an addition"; the subject always in English, "Suggested
// addition: <the saint's own name>"; the line "What would you add to this
// life, and where is it written?"). What a reader would notice if this
// broke: no way to offer what a life lacks, or an email the team cannot
// sort because its subject came out in another language, or no subject.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { suggestionHref } from "@/components/saints/SuggestAddition";
import { SUPPORT_EMAIL } from "@/lib/legal/entity";

const MESSAGES = path.join(process.cwd(), "lib/i18n/messages");
const catalog = (code: string) => JSON.parse(fs.readFileSync(path.join(MESSAGES, `${code}.json`), "utf8")) as Record<string, string>;
const CODES = fs.readdirSync(MESSAGES).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));

describe("Suggest an addition", () => {
  it("writes to support with the saint's own name in an English subject", () => {
    expect(SUPPORT_EMAIL).toBe("support@purifyapp.net");
    expect(suggestionHref("St. Memnon of Ephesus")).toBe("mailto:support@purifyapp.net?subject=Suggested%20addition%3A%20St.%20Memnon%20of%20Ephesus");
    // A name with letters outside ASCII still arrives whole.
    expect(decodeURIComponent(suggestionHref("St. Justin Popović").split("subject=")[1])).toBe("Suggested addition: St. Justin Popović");
  });

  it("says the owner's words in English", () => {
    const en = catalog("en");
    expect(en["saints.suggest.link"]).toBe("Suggest an addition");
    expect(en["saints.suggest.line"]).toBe("What would you add to this life, and where is it written?");
  });

  it("says its line and its link in every language the app speaks", () => {
    expect(CODES.length).toBe(21);
    for (const code of CODES) {
      const c = catalog(code);
      for (const key of ["saints.suggest.line", "saints.suggest.link"]) {
        expect(c[key]?.trim(), `${code} ${key}`).toBeTruthy();
        expect(c[key], `${code} ${key} has an em dash`).not.toMatch(/—/);
      }
      if (code !== "en") expect(c["saints.suggest.line"], `${code} still in English`).not.toBe(catalog("en")["saints.suggest.line"]);
    }
  });

  it("stands under the life, on every saint's page", () => {
    const life = fs.readFileSync(path.join(process.cwd(), "components/saints/SaintLife.tsx"), "utf8");
    const under = life.indexOf("<SuggestAddition name={saint.name} />");
    expect(under).toBeGreaterThan(life.indexOf("<LifeSection"));
    expect(under).toBeLessThan(life.indexOf("{after.map("));
  });
});
