// The reading room's labels, in every language (1.7).
//
// The themes, traditions, eras, lengths and the parts of a book are drawn by
// keys the screens compute (`reading.theme.${id}`), so no literal t("...")
// names them and lib/i18n/__tests__/keysExist.test.ts cannot see them: a
// missing one would draw as the key itself on a chip. This holds each of them
// to the English beside it in lib/reading/catalog.ts, letter for letter, and
// to words in all twenty-one catalogs, as lib/i18n/__tests__/smallLabels.test.ts
// does for the saints' groups. Whether the words are the right ones waits for
// native readers; the passions' names are the ascetic tradition's terms.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";
import {
  ERAS,
  LENGTHS,
  PART_KINDS,
  THEMES,
  TRADITIONS,
  eraKey,
  eraSpanKey,
  lengthKey,
  partKey,
  themeKey,
  traditionKey,
} from "@/lib/reading/catalog";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const catalog = (code: string) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "lib", "i18n", "messages", `${code}.json`), "utf8")) as Record<string, string>;
const EN = catalog("en");
const EM_DASH = String.fromCharCode(0x2014);

const pairs: { key: string; english: string }[] = [
  ...THEMES.map((t) => ({ key: themeKey(t.id), english: t.label })),
  ...TRADITIONS.map((t) => ({ key: traditionKey(t.id), english: t.label })),
  ...ERAS.map((e) => ({ key: eraKey(e.id), english: e.label })),
  ...ERAS.map((e) => ({ key: eraSpanKey(e.id), english: e.span })),
  ...LENGTHS.map((l) => ({ key: lengthKey(l.id), english: l.label })),
];
const parts = PART_KINDS.flatMap((k) => [partKey(k, false), partKey(k, true)]);

describe("the reading room's labels", () => {
  it("are the English beside them, letter for letter", () => {
    for (const { key, english } of pairs) expect(EN[key], key).toBe(english);
    for (const key of parts) expect(EN[key], key).toMatch(/\{(n|from)\}/);
  });

  it("have words in every language, keep their placeholders, and carry no em dash", () => {
    for (const { code } of LOCALES) {
      const m = catalog(code);
      for (const key of [...pairs.map((p) => p.key), ...parts]) {
        expect(m[key]?.trim(), `${code} ${key}`).toBeTruthy();
        expect(m[key].includes(EM_DASH), `${code} ${key}`).toBe(false);
      }
      for (const key of parts) {
        const run = /s$|ies$/.test(key.split(".").pop()!);
        if (run) {
          expect(m[key], `${code} ${key}`).toContain("{from}");
          expect(m[key], `${code} ${key}`).toContain("{to}");
        } else expect(m[key], `${code} ${key}`).toContain("{n}");
      }
    }
  });

  it("are no longer the room's retired words", () => {
    for (const gone of ["reading.eyebrow", "reading.subtitle", "reading.nextRead", "reading.popular", "reading.enterDeeper", "reading.topics"]) {
      for (const { code } of LOCALES) expect(catalog(code)[gone], `${code} ${gone}`).toBeUndefined();
    }
  });
});
