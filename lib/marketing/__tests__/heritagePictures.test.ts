// No picture on the heritage list goes into anything that can go out (the
// owner's word of 2026-11-11 on docs/1.9-build/notes/pictures-heritage-law.md:
// kept in the app, never in ads; the list is lib/marketing/heritagePictures.ts).
// What can go out: the promo maker's scripts (its looks, its edit frames, its
// cards and their captures) and each release's store and email pictures.
// A screen of a page that shows one is not a file name, so it is looked at by
// eye before it is used (scripts/promo/README.md, and the release pictures'
// own header).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { HERITAGE_PICTURES, heritageNamedIn } from "@/lib/marketing/heritagePictures";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const OUTGOING = [
  ...readdirSync(join(root, "scripts/promo"))
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => `scripts/promo/${f}`),
  "scripts/release-pictures.mjs",
  ...readdirSync(join(root, "docs/plans"))
    .filter((d) => existsSync(join(root, "docs/plans", d, "pictures.json")))
    .map((d) => `docs/plans/${d}/pictures.json`),
];

// The Vault's three, kept as they are and marked on the SSM board (the
// arbiter's word of 2026-11-11): PR look 3, St John Chrysostom's mosaic
// (looks.mjs, its art copied by lib.mjs), and edit frame 9's wall of saints
// (edits.mjs, its art copied by edit-capture.mjs). Edit frame 1, the saint
// web, names no file: its screen shows the mosaic, and it is marked by eye.
// Each count is what the Vault holds today; one more fails.
const VAULT: Record<string, Record<string, number>> = {
  "scripts/promo/looks.mjs": { "john-chrysostom.v2": 2 },
  "scripts/promo/lib.mjs": { "john-chrysostom.v2": 2 },
  "scripts/promo/edits.mjs": { "moses-the-black.v2": 2, "john-chrysostom.v2": 1, "justinian-the-great.v2": 1 },
  "scripts/promo/edit-capture.mjs": { "moses-the-black.v2": 2, "john-chrysostom.v2": 2, "justinian-the-great.v2": 2 },
};

describe("the heritage list", () => {
  const note = read("docs/1.9-build/notes/pictures-heritage-law.md");

  it("names each picture as the note names it, at the place the note gives", () => {
    for (const picture of HERITAGE_PICTURES) {
      expect(note, picture.named).toContain(picture.named);
    }
    expect(HERITAGE_PICTURES.length).toBeGreaterThanOrEqual(31);
    for (const place of ["Dionysiou", "Stavronikita", "Protaton", "Hosios Loukas", "Nea Moni", "Loutraki", "Veria", "Loverdos", "Heraklion", "San Vitale", "Sant'Apollinare Nuovo", "Sancta Sanctorum"]) {
      expect(note, place).toContain(place);
      expect(HERITAGE_PICTURES.some((p) => p.place.includes(place)), place).toBe(true);
    }
  });

  it("holds only files the app has", () => {
    for (const picture of HERITAGE_PICTURES) {
      for (const file of picture.files) expect(existsSync(join(root, "public", file)), `${picture.named}: public/${file}`).toBe(true);
    }
  });

  it("knows a listed file however it is written, and nothing else for one", () => {
    expect(heritageNamedIn(`<img src="../art/john-chrysostom.v2.jpg">`)).toEqual({ "john-chrysostom.v2": 1 });
    expect(heritageNamedIn(`"public/covers/authors/justin-martyr.v1.avif", 'history/media/martyrdom-of-polycarp.v1.jpg'`)).toEqual({
      "justin-martyr.v1": 1,
      "martyrdom-of-polycarp.v1": 1,
    });
    expect(heritageNamedIn(`paul-of-thebes.v1.jpg`)).toEqual({ "paul-of-thebes.v1": 1 });
    // Not on the list: Chrysostom's older icon, his Kirillo-Belozersky portrait, a route to his page.
    expect(heritageNamedIn(`john-chrysostom.jpg covers/saints/john-chrysostom.v1.jpg /saints/john-chrysostom/web/`)).toEqual({});
  });
});

describe("what can go out", () => {
  it("names no picture on the heritage list, the Vault's three kept as they are", () => {
    expect(OUTGOING.length).toBeGreaterThan(10);
    for (const file of OUTGOING) {
      for (const [stem, count] of Object.entries(heritageNamedIn(read(file)))) {
        const kept = VAULT[file]?.[stem] ?? 0;
        expect(count, `${file} names ${stem}, a picture on the heritage list (docs/1.9-build/notes/pictures-heritage-law.md): kept in the app, never in ads`).toBeLessThanOrEqual(kept);
      }
    }
  });
});
