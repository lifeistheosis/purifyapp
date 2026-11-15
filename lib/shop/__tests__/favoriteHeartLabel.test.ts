// The shop's heart says what it saves (1.9, Updates 77). It said "Save this
// icon" on every piece, so a reader using a screen reader heard it on a prayer
// rope and on a cross (Gate 3b, the sold-out 33-knot rope). Now the heart is
// named by the piece it sits on, in the reader's language, with the words the
// saints' and the events' hearts already use, to save and to remove: "Remove
// from saved" was English in every language.
//
// What a reader would notice if this broke: the heart called an icon on a piece
// that is not one, or English words in another language.
//
// This reads the source; vitest runs in node with no DOM (vitest.config.ts).

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note quoting the old label is not read as the label. */
const code = (p: string) =>
  read(p)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const heart = code("components/shop/FavoriteButton.tsx");
const locales = ["ar", "bg", "de", "el", "en", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"];

describe("the shop's heart", () => {
  it("never calls every piece an icon, nor speaks English in another language", () => {
    expect(heart).not.toMatch(/this icon/i);
    expect(heart).not.toContain('"Remove from saved"');
  });

  it("is named by the piece it sits on, through the label the other hearts use", () => {
    expect(heart).toContain('t("saints.saveAria", { name: title })');
    // The same words for the reader who hears it and the one who hovers it.
    expect(heart).toContain("aria-label={label}");
    expect(heart).toContain("title={label}");
    expect(heart).toContain(
      'const label = saved ? t("saints.saveRemoveAria", { name: title }) : t("saints.saveAria", { name: title });',
    );
  });

  it("has those words, with the piece's name in them, in every language", () => {
    for (const l of locales) {
      const messages = JSON.parse(read(`lib/i18n/messages/${l}.json`)) as Record<string, string>;
      for (const key of ["saints.saveAria", "saints.saveRemoveAria"]) {
        expect(messages[key], `${l} ${key}`).toBeTruthy();
        expect(messages[key], `${l} ${key}`).toContain("{name}");
      }
    }
  });
});
