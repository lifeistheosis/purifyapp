import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";
import { deleteIntention, readIntentions, reposeDateText, restoreIntention, writeIntentions, type Intention } from "@/lib/prayers/storage";

/**
 * The page of Your rule (/prayers/personal), held to what a design round
 * found on it (sheet r3-27, the owner's note 73: "fix all of them"):
 *
 *  1. both lists' lines printed a web address, "/prayers/today";
 *  2. a repose date printed as typed, 2019-03-04;
 *  3. removing a name asked in the browser's own confirm box;
 *
 * Each fix is measured on the built page by scripts/export-walk.mjs too.
 */

const ROOT = process.cwd();
const catalog = (code: string): Record<string, string> =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "lib", "i18n", "messages", `${code}.json`), "utf8"));
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note about the old page is not read as the page. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(e.name)) out.push(rel);
  }
  return out;
}

/** This device's storage, in memory. */
function deviceStorage() {
  const kept = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => kept.get(k) ?? null,
      setItem: (k: string, v: string) => void kept.set(k, v),
      removeItem: (k: string) => void kept.delete(k),
    },
    dispatchEvent: () => true,
  });
  vi.stubGlobal("CustomEvent", class extends Event {});
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the lists' lines", () => {
  it("name Today in words, in every language, and print no address", () => {
    for (const { code } of LOCALES) {
      const m = catalog(code);
      for (const key of ["prayers.diptychs.livingIntro", "prayers.diptychs.reposedIntro"]) {
        expect(m[key], `${code} ${key}`).not.toContain("/");
        // The page's name as the catalog writes it on the tab and the page.
        expect(m[key], `${code} ${key}`).toContain(m["nav.today"]);
      }
    }
  });
});

describe("a repose date", () => {
  it("is written as the reader's language writes a date", () => {
    expect(reposeDateText("2019-03-04", "en")).toBe("Mar 4, 2019");
    expect(reposeDateText("2019-03-04", "de")).toBe("4. März 2019");
    expect(reposeDateText("2019-03-04", "fr")).toBe("4 mars 2019");
    for (const { code } of LOCALES) expect(reposeDateText("2019-03-04", code), code).not.toContain("2019-03");
  });

  it("is the calendar's day wherever the reader is, and kept as typed when it is no day", () => {
    // Written in UTC: a day, not a moment, so no zone moves it to March 3.
    expect(reposeDateText("2019-03-04", "en")).toBe("Mar 4, 2019");
    expect(reposeDateText("2020-02-29", "en")).toBe("Feb 29, 2020");
    expect(reposeDateText("0099-01-01", "en")).toContain("99");
    expect(reposeDateText("0099-01-01", "en")).not.toContain("1999");
    for (const bad of ["2019-02-29", "2019-13-01", "2019-3-4", "", "yesterday"]) expect(reposeDateText(bad, "en")).toBe(bad);
  });

  it("is what the row prints, never the stored text", () => {
    const src = read("components/prayers/Diptychs.tsx");
    expect(src).toContain("reposeDateText(entry.repose, locale)");
    expect(src).not.toMatch(/reposedLabel"\)\} \$\{entry\.repose\}/);
  });
});

describe("removing a name", () => {
  const name = (id: string): Intention => ({ id, name: id, addedAt: "2026-10-31T00:00:00.000Z" });

  it("asks nothing in the browser's own boxes, anywhere in the prayer pages", () => {
    const files = [...walk("components/prayers"), ...walk("app/(app)/prayers")];
    expect(files.length).toBeGreaterThan(20);
    const asking = files.filter((f) => /(^|[^\w.])(window\.)?(confirm|alert|prompt)\(/m.test(code(f)));
    expect(asking).toEqual([]);
  });

  it("takes it out at once, with the rule's own Removed line and Undo", () => {
    const src = code("components/prayers/Diptychs.tsx");
    expect(src).toContain("onDelete={() => remove(entry)}");
    expect(src).toMatch(/deleteIntention\(kind, entry\.id\);\s*window\.clearTimeout\(undoTimer\.current\);\s*setUndo\(\{ entry, index \}\);/);
    expect(src).toContain('<p role="status"');
    expect(src).toContain('removedLine(t("prayers.mine.removed"), undo.entry.name)');
    expect(src).toContain('t("prayers.mine.undo")');
    expect(src).toContain("restoreIntention(kind, undo.entry, undo.index)");
  });

  it("and Undo puts it back where it stood, once", () => {
    deviceStorage();
    writeIntentions("living", [name("anna"), name("basil"), name("clare")]);
    deleteIntention("living", "basil");
    expect(readIntentions("living").map((n) => n.id)).toEqual(["anna", "clare"]);
    restoreIntention("living", name("basil"), 1);
    expect(readIntentions("living").map((n) => n.id)).toEqual(["anna", "basil", "clare"]);
    // A second Undo, or one after the name came back by sync, adds nothing.
    restoreIntention("living", name("basil"), 0);
    expect(readIntentions("living").map((n) => n.id)).toEqual(["anna", "basil", "clare"]);
    // A place past the end, after others were removed meanwhile, is the end.
    deleteIntention("living", "clare");
    deleteIntention("living", "anna");
    restoreIntention("living", name("clare"), 2);
    expect(readIntentions("living").map((n) => n.id)).toEqual(["basil", "clare"]);
  });
});
