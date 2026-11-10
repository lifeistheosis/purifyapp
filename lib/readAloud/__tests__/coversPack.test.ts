// The covers pack (1.9; docs/PACKS.md): the read-aloud covers' map, sent by
// the website so a cover chosen after a store build reaches the apps with a
// website deploy.
//
// What it holds: the website sends its own map whole (every book, each
// figure's file and its name in all 21 languages); the apps read it strictly
// and throw the whole pack away for one entry off its shape (a file outside
// /covers/, another site, markup in a name, a cover naming a figure the pack
// does not carry); the app uses the pack only once it is put in place, which
// PackBridge does after the first screen is drawn, in the apps alone; a book
// the pack does not name keeps the build's cover; the line under a title
// names the figure in the reader's language.
//
// What a reader would notice if this broke: a new cover that never reaches
// the phone, a cover from somewhere other than Purify's website, or a page
// that flickers between two covers as it opens.

import fs from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";
import { PACK_SCHEMAS, readCoversPack, type CoversPack } from "@/lib/packs/types";
import { BOOK_COVERS, COVER_PLATE, coverName, coversPackOf, readAloudCover, setCoversPack } from "@/lib/readAloud/covers";

const names = (nameKey: string) => Object.fromEntries(LOCALES.map(({ code }) => [code, getMessages(code)[nameKey]]));
const WEBSITE = (): CoversPack => ({ ...coversPackOf(names), schema: PACK_SCHEMAS.covers });
const t = (key: string) => getMessages("en")[key] ?? key;

afterEach(() => setCoversPack(null));

describe("the covers pack the website sends", () => {
  it("is the build's own map, every book, and each figure's file and name in all 21 languages", () => {
    const pack = WEBSITE();
    expect(Object.keys(pack.books).sort()).toEqual(Object.keys(BOOK_COVERS).sort());
    for (const [book, id] of Object.entries(pack.books)) {
      expect(id, book).toBe(BOOK_COVERS[book] === "plate" ? "plate" : BOOK_COVERS[book]);
      if (id === "plate") continue;
      expect(pack.figures[id].file, book).toMatch(/^\/covers\/[A-Za-z0-9-]+\.v\d+\.jpg$/);
      expect(Object.keys(pack.figures[id].names), book).toHaveLength(21);
    }
    expect(readCoversPack(JSON.parse(JSON.stringify(pack)))).toEqual(pack);
  });
});

/** The pack as it comes off the wire: plain JSON, to spoil one field at a time. */
type Wire = { schema: number; books: Record<string, string>; figures: Record<string, { file: string; names: Record<string, string> }> };

describe("the apps' check", () => {
  const good = (): Wire => JSON.parse(JSON.stringify(WEBSITE())) as Wire;

  it.each([
    ["a file outside /covers/", (p: Wire) => (p.figures.john.file = "/sections/john.v1.jpg")],
    ["another site", (p: Wire) => (p.figures.john.file = "https://example.com/covers/john.v1.jpg")],
    ["a way up out of the folder", (p: Wire) => (p.figures.john.file = "/covers/../john.v1.jpg")],
    ["no version in the name", (p: Wire) => (p.figures.john.file = "/covers/john.jpg")],
    ["markup in a name", (p: Wire) => (p.figures.john.names.en = "<b>John</b>")],
    ["no English name", (p: Wire) => delete (p.figures.john.names as Partial<Record<string, string>>).en],
    ["a cover naming a figure the pack does not carry", (p: Wire) => (p.books.john = "thaddeus")],
    ["a book that is not a slug", (p: Wire) => (p.books["../john"] = "john")],
    ["another shape", (p: Wire) => (p.schema = 2)],
  ])("throws the whole pack away for %s", (_label, spoil) => {
    const pack = good();
    spoil(pack);
    expect(readCoversPack(pack)).toBeNull();
  });

  it("keeps a figure the build does not know, with its names, when its file is the website's", () => {
    const pack = good();
    pack.figures.nehemiah = { file: "/covers/nehemiah.v1.jpg", names: { en: "Nehemiah", ru: "Неемия" } };
    pack.books.nehemiah = "nehemiah";
    const read = readCoversPack(pack)!;
    expect(read.books.nehemiah).toBe("nehemiah");
    expect(read.figures.nehemiah.names.ru).toBe("Неемия");
  });
});

describe("a book's cover in the app", () => {
  it("is the build's own until the pack is put in place, and the pack's after", () => {
    // Nehemiah is on the plate in this build: no picture of him passed
    // (docs/licensing/READ_COVERS.md), so the pack is what can give him one.
    // Should he get a cover, pick another book still on the plate.
    expect(BOOK_COVERS.nehemiah, "a book still on the plate").toBe("plate");
    expect(readAloudCover("nehemiah").src).toBe(COVER_PLATE);
    const pack = WEBSITE();
    pack.figures.nehemiah = { file: "/covers/nehemiah.v1.jpg", names: { en: "Nehemiah", ru: "Неемия" } };
    pack.books.nehemiah = "nehemiah";
    setCoversPack(pack);
    const cover = readAloudCover("nehemiah");
    expect(cover.src).toMatch(/\/covers\/nehemiah\.v1\.jpg$/);
    expect(cover.fallback).toBe(COVER_PLATE);
    expect(cover.size).toBe("1024x1024");
    expect(coverName(cover, t, "ru")).toBe("Неемия");
    expect(coverName(cover, t, "de")).toBe("Nehemiah");
    // A book the build knows keeps its own words where the pack has them too.
    expect(coverName(readAloudCover("john"), t, "en")).toBe("St John the Theologian");
  });

  it("keeps the build's cover for a book the pack does not name", () => {
    const pack = WEBSITE();
    delete pack.books.john;
    setCoversPack(pack);
    expect(readAloudCover("john").src).toMatch(/\/covers\/john\.v1\.jpg$/);
    expect(readAloudCover("john").names).toBeUndefined();
  });

  it("is put in place by PackBridge after the first screen is drawn, in the apps alone, and again when a newer answer is kept", () => {
    const bridge = fs.readFileSync("components/native/PackBridge.tsx", "utf8");
    const effect = bridge.slice(bridge.indexOf("useEffect(() => {"));
    expect(effect.indexOf("if (!isNativeClient()) return;")).toBeLessThan(effect.indexOf("placeCovers();"));
    expect(effect).toContain("const placeCovers = () => setCoversPack(savedPacks()?.packs.covers ?? null);");
    expect(effect).toContain("const offCovers = subscribePacks(placeCovers);");
    // Never at import: a page drawn into the export and its first draw must agree.
    const covers = fs.readFileSync("lib/readAloud/covers.ts", "utf8");
    expect(covers).not.toMatch(/savedPacks\(/);
  });

  it("is drawn again where a screen shows covers, when the pack comes", () => {
    for (const file of [
      "components/plans/PlansClient.tsx",
      "components/florilegium/FlorilegiaHub.tsx",
      "components/you/KeptShelf.tsx",
      "components/you/PickUpCard.tsx",
      "components/community/ComposePage.tsx",
      "components/billing/plusTry/TryOffline.tsx",
    ]) {
      expect(fs.readFileSync(file, "utf8"), file).toContain("useCoversVersion();");
    }
    const hook = fs.readFileSync("lib/readAloud/useCovers.ts", "utf8");
    expect(hook).toContain("useSyncExternalStore(subscribeCovers, coversVersion, () => 0)");
  });
});
