import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { READING_THEMES } from "@/lib/reader/readingModes";
import { DRAWINGS, EARLIER_DRAWINGS } from "@/scripts/theme-pictures.mjs";

/**
 * The looks' pictures (1.9): public/themes/.
 *
 * A look is a palette and one picture: a scene at the foot of the page, a
 * room behind it, sometimes a sign at a chapter's head. The stylesheet names
 * each picture by its address, and nothing in a build checks an address in a
 * stylesheet: a file renamed, or left out of a commit, is a look with a hole
 * where its picture was, on a reader's phone and nowhere else.
 *
 * What this holds: every address the stylesheet names is a file; every file
 * is named by the stylesheet (nothing ships unused); every file has a row in
 * docs/licensing/THEME_PICTURES.md and every row a file (an image ships only
 * if its source is recorded); every drawing on disk is exactly what
 * scripts/theme-pictures.mjs draws today, so the script really is how they
 * are made; and the whole folder stays small.
 *
 * What it does not hold: how a picture looks. That was done by eye, on a
 * phone's screen, in its look.
 */

const ROOT = process.cwd();
const DIR = path.join(ROOT, "public", "themes");
const FILES = fs.readdirSync(DIR).sort();
const CSS = fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const NAMED = [...CSS.matchAll(/url\("\/themes\/([^"]+)"\)/g)].map((m) => m[1]);
const RECORD = fs.readFileSync(path.join(ROOT, "docs", "licensing", "THEME_PICTURES.md"), "utf8");
const ROWS = [...RECORD.matchAll(/^\| `([^`]+)` \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|$/gm)].map((m) => ({
  file: m[1],
  look: m[2].trim(),
  what: m[3].trim(),
  source: m[4].trim(),
  licence: m[5].trim(),
}));

describe("the looks' pictures", () => {
  it("every address the stylesheet names is a file, and every file is named", () => {
    expect(NAMED.length).toBeGreaterThan(0);
    for (const name of NAMED) expect(FILES, `url("/themes/${name}") has no file`).toContain(name);
    for (const file of FILES) expect(NAMED, `${file} ships and nothing draws it`).toContain(file);
    // Named once each, as a custom property, so a look that is not worn fetches nothing.
    expect(new Set(NAMED).size).toBe(NAMED.length);
    const root = /The looks \(1\.9\)[\s\S]*?\n:root \{([^}]*)\}/.exec(fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8"))?.[1] ?? "";
    for (const name of NAMED) expect(root, name).toMatch(new RegExp(`--[a-z-]+: url\\("/themes/${name.replace(".", "\\.")}"\\);`));
  });

  it("no look reaches for a picture by an address typed anywhere else", () => {
    const sources = (dir: string): string[] =>
      fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === "__tests__" || e.name === "node_modules" ? [] : sources(rel);
        return /\.(tsx?|css)$/.test(e.name) ? [rel] : [];
      });
    const elsewhere = [...sources("app"), ...sources("components"), ...sources("lib")]
      .filter((f) => f !== path.join("app", "globals.css"))
      .filter((f) => fs.readFileSync(path.join(ROOT, f), "utf8").includes("/themes/"));
    expect(elsewhere).toEqual([]);
  });

  it("each is recorded in docs/licensing/THEME_PICTURES.md, and each row is a file", () => {
    expect(ROWS.map((r) => r.file).sort()).toEqual(FILES);
    for (const row of ROWS) {
      expect(row.what.length, row.file).toBeGreaterThan(10);
      expect(row.licence, row.file).toMatch(/^(Purify's own|Public domain)$/);
      // What is made from a plate says which, and where its own licence is recorded.
      if (row.licence === "Public domain" && /room/.test(row.file)) expect(row.source, row.file).toContain("SHARE_FLOWERS.md");
      // What is made from a plate of a book names the book and its year, and the plate is kept beside this record.
      const plate = { "athos.webp": [/Riley.*1887/, "riley-1887-monastery-of-st-paul.jpg"], "forest.webp": [/Plate 54.*Köhler/, "kohler-medizinal-pflanzen-54-abies-alba.jpg"] }[row.file] as [RegExp, string] | undefined;
      if (plate) {
        expect(row.licence, row.file).toBe("Public domain");
        expect(row.source, row.file).toMatch(plate[0]);
        expect(fs.existsSync(path.join(ROOT, "docs", "licensing", "plates", plate[1])), row.file).toBe(true);
      }
    }
    // The plates a look is made from are the ones the quote pictures ship.
    const plates = fs.readdirSync(path.join(ROOT, "public", "share", "flowers"));
    for (const named of RECORD.matchAll(/`((?:rose-centifolia|rose-regalis|lavender|olive)\.webp)`/g)) expect(plates).toContain(named[1]);
  });

  it("each row names a look the app has", () => {
    const names = new Set(READING_THEMES.filter((t) => t.look).map((t) => t.label));
    for (const row of ROWS) expect(names.has(row.look), `${row.file}: ${row.look}`).toBe(true);
  });

  it("the land looks' first drawings are kept where the apps do not carry them, as the script draws them", () => {
    const kept = EARLIER_DRAWINGS as Record<string, { dir: string; file: string; draw: () => { svg: string } }>;
    expect(Object.keys(kept).sort()).toEqual(["athos", "forest", "jordan"]);
    for (const [id, { dir, file, draw }] of Object.entries(kept)) {
      expect(path.relative(ROOT, dir).startsWith(path.join("docs", "1.9-build", "kept")), id).toBe(true);
      expect(fs.readFileSync(path.join(dir, file), "utf8"), id).toBe(`${draw().svg}\n`);
      expect(FILES, id).not.toContain(`${id}.svg`);
    }
  });

  it("Jordan has no picture: the page's own colour runs to the foot (Desert, the other, came out of the app)", () => {
    for (const id of ["jordan"]) {
      const block = new RegExp(`html\\[data-look="${id}"\\] \\{([^}]*)\\}`).exec(CSS)?.[1] ?? "";
      expect(block, id).toMatch(/--room: #[0-9a-f]{6};/);
      expect(block, id).not.toContain("url(");
      expect(CSS, id).not.toContain(`--scene-${id}`);
    }
  });

  it("every drawing on disk is what the script draws, to the letter", () => {
    const drawn = Object.keys(DRAWINGS).sort();
    expect(drawn).toEqual(FILES.filter((f) => f.endsWith(".svg")));
    for (const [file, draw] of Object.entries(DRAWINGS as Record<string, () => { svg: string }>)) {
      expect(fs.readFileSync(path.join(DIR, file), "utf8"), file).toBe(`${draw().svg}\n`);
    }
  });

  it("a drawing is shapes and gradients only: no picture inside it, no script, no font, nothing fetched", () => {
    for (const file of FILES.filter((f) => f.endsWith(".svg"))) {
      const text = fs.readFileSync(path.join(DIR, file), "utf8");
      expect(text, file).not.toMatch(/<image|<script|<foreignObject|<text|font-family|href=|url\((?!#)/);
    }
  });

  it("the eight painted ones and the engraved one are WebP, and the folder stays under a megabyte", () => {
    const painted = FILES.filter((f) => f.endsWith(".webp"));
    // Nine painted until Fire came out of the looks: its room is kept in docs/1.9-build/kept/fire-look/, not here.
    // The two others are made from a plate of a book each (2026-11-13): the Holy Mountain's and Forest's.
    const fromPlates = ["athos.webp", "forest.webp"];
    expect(painted.filter((f) => !fromPlates.includes(f))).toHaveLength(8);
    for (const f of fromPlates) expect(painted).toContain(f);
    for (const file of painted) {
      const head = fs.readFileSync(path.join(DIR, file)).subarray(0, 12);
      expect(head.subarray(0, 4).toString("latin1"), file).toBe("RIFF");
      expect(head.subarray(8, 12).toString("latin1"), file).toBe("WEBP");
    }
    expect(FILES.filter((f) => !/\.(svg|webp)$/.test(f))).toEqual([]);
    const bytes = FILES.reduce((sum, f) => sum + fs.statSync(path.join(DIR, f)).size, 0);
    expect(bytes).toBeLessThan(1024 * 1024);
    // No one picture is heavy enough to be felt when its look is first worn.
    for (const f of FILES) expect(fs.statSync(path.join(DIR, f)).size, f).toBeLessThan(200 * 1024);
  });
});
