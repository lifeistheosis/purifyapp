// The GNU GPL beside the Almeida (1.9, the arbiter's word of 2026-11-11:
// the transcription the Portuguese Bible is read from is distributed under
// the GNU GPL, and the licence asks that its terms travel with the text).
// What would go wrong if this broke: the Almeida shipped with its licence
// named but not given, a licence text changed by a hand, a page the apps do
// not carry, or no way from the Bible's own line to the licence and to
// Purify's converted copy.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ALMEIDA_COPY, GPL_FILE, gplParagraphs } from "@/lib/credits/gpl";
import { LICENCE_PAGES } from "@/lib/credits/licencePages";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("the GNU GPL beside the Almeida", () => {
  it("is gnu.org's own text of version 3, byte for byte", () => {
    const bytes = fs.readFileSync(GPL_FILE);
    // sha256 of https://www.gnu.org/licenses/gpl-3.0.txt, fetched 2026-11-11.
    expect(crypto.createHash("sha256").update(bytes).digest("hex")).toBe("3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986");
  });

  it("is drawn whole, its lines joined into paragraphs and not a word changed", () => {
    const text = fs.readFileSync(GPL_FILE, "utf8");
    const paragraphs = gplParagraphs(text);
    expect(paragraphs.slice(0, 2)).toEqual(["GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"]);
    expect(paragraphs).toContain("Preamble");
    expect(paragraphs).toContain("TERMS AND CONDITIONS");
    expect(paragraphs.at(-1)).toContain("<https://www.gnu.org/licenses/why-not-lgpl.html>.");
    // Every word of the file, in order, and nothing else.
    const words = (s: string) => s.split(/\s+/).filter(Boolean);
    expect(words(paragraphs.join(" "))).toEqual(words(text));
  });

  it("has a page of its own, in the export and offline, that says where Purify's converted copy is", () => {
    const page = read("app/(app)/credits/gpl/page.tsx");
    expect(page).toContain("gplParagraphs()");
    expect(page).toContain('titleKey="credits.gpl.title"');
    expect(page).not.toMatch(/force-dynamic|cookies\(|headers\(/);
    expect(ALMEIDA_COPY.files).toBe("https://github.com/lifeistheosis/purifyapp/tree/main/public/bibles/pt-almeida-1911");
    expect(fs.existsSync(path.join(ROOT, "public/bibles/pt-almeida-1911"))).toBe(true);
    expect(ALMEIDA_COPY.scripts).toBe("https://github.com/lifeistheosis/purifyapp/tree/main/scripts/bibles");
    expect(fs.existsSync(path.join(ROOT, "scripts/bibles/sword-extract.py"))).toBe(true);
    // The web-only trees the native build sets aside do not hold it.
    expect(read("scripts/native-build.mjs")).not.toMatch(/["'`]credits(\/gpl)?["'`]/);
  });

  it("is reached from the Almeida's own line under each chapter", () => {
    expect(LICENCE_PAGES).toEqual({ "pt-almeida-1911": "/credits/gpl/" });
    const screen = read("components/bible/ChapterScreen.tsx");
    expect(screen).toContain("LICENCE_PAGES[downloaded.bible.id]");
    expect(screen).toContain('<T k="credits.gpl.link" />');
    // The line still names the licence, in every language.
    for (const name of fs.readdirSync(path.join(ROOT, "lib/i18n/messages")).filter((f) => f.endsWith(".json"))) {
      const cat = JSON.parse(read(`lib/i18n/messages/${name}`)) as Record<string, string>;
      expect(cat["bible.downloads.source.pt-almeida-1911"], name).toContain("GNU GPL");
      for (const key of ["title", "intro", "copy", "link"]) {
        expect(cat[`credits.gpl.${key}`], `${name} credits.gpl.${key}`).toBeTruthy();
        expect(cat[`credits.gpl.${key}`], `${name} credits.gpl.${key}`).not.toContain("—");
      }
    }
  });
});
