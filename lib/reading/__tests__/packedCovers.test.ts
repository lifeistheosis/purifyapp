// The reading room's covers in the covers pack (1.9, build 89 note 3: the
// owner's "ok to all", relayed with "Through the covers pack, so later ones
// go live from the website").
//
// What it holds: the website sends each room book's picture that is a file
// of its /covers/ folder, and each How you feel door's icon, made by the same
// functions the room is drawn with; the apps read them strictly and throw the
// whole pack away for one entry off its shape; once the pack is in place a
// book or a door it names takes the website's picture, one it does not name
// keeps the build's, a council's document keeps its window, and a picture
// that is a book's own (a council's icon, a saint of the text) is never drawn
// beside the byline as the author's face.
//
// What a reader would notice if this broke: a cover found after a store
// build that never reaches the phone, a picture from somewhere other than
// Purify's website, a council's icon drawn as St Alexander's face, or a room
// that flickers between two covers as it opens.

import fs from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/whatsNew/boardLive", async () => {
  const { currentBoardMessage } = await import("@/lib/whatsNew/board");
  return { getBoardMessage: async () => ({ message: currentBoardMessage(), fromFallback: true }) };
});

import { buildPacks } from "@/lib/packs/server";
import { PACKS_MAX_CHARS, readCoversPack } from "@/lib/packs/types";
import { setCoversPack } from "@/lib/readAloud/covers";
import { FEELING_COVERS } from "@/lib/reading/authorCovers";
import { buildRoom, readingCovers } from "@/lib/reading/cards";
import { WORK_ART } from "@/lib/reading/coverArt";
import { packedCard, packedDoors, withPackedCovers } from "@/lib/reading/packedCovers";
import type { Card } from "@/lib/reading/select";

const made = async () => (await buildPacks(new Date("2026-11-10T06:00:00Z"))).packs.covers!;

afterEach(() => setCoversPack(null));

describe("what the website sends", () => {
  it("is every room book whose picture is the website's own file, and every door, read whole by the apps' check", async () => {
    const pack = await made();
    const room = buildRoom(false);
    for (const card of room.cards) {
      const c = card.cover;
      if (c && !c.crop && c.src.startsWith("/covers/")) expect(pack.works?.[card.key], card.key).toEqual({ file: c.src, focusY: c.focusY, ...(c.bookOnly ? { bookOnly: true } : {}) });
      else expect(pack.works?.[card.key], card.key).toBeUndefined();
    }
    for (const [slug, art] of Object.entries(FEELING_COVERS)) expect(pack.feelings?.[slug], slug).toEqual({ file: art.file, focusY: art.focusY });
    expect(readCoversPack(JSON.parse(JSON.stringify(pack)))).toEqual(pack);
    // A council's icon on St Alexander's letter goes as the book's own picture.
    expect(pack.works?.["alexander-of-alexandria/encyclical-against-arius"]?.bookOnly).toBe(true);
    expect(pack.works?.["athanasius-the-great/on-the-incarnation"]?.bookOnly).toBeUndefined();
  });

  it("stays a small part of what the apps will read", async () => {
    const size = JSON.stringify(readingCovers()).length;
    expect(size).toBeLessThan(PACKS_MAX_CHARS / 10);
  });
});

/** The covers pack as it comes off the wire, plain JSON, to spoil one field at a time. */
type Wire = {
  schema: number;
  books: Record<string, string>;
  figures: Record<string, unknown>;
  works: Record<string, Record<string, unknown>>;
  feelings: Record<string, Record<string, unknown>>;
};

describe("the apps' check", () => {
  const good = async (): Promise<Wire> => JSON.parse(JSON.stringify(await made())) as Wire;
  const KEY = "tarasius-of-constantinople/words-at-the-seventh-council";

  it.each([
    ["a book's picture outside /covers/", (p: Wire) => (p.works[KEY].file = "/saints/icons/tarasius-of-constantinople.jpg")],
    ["a book's picture on another site", (p: Wire) => (p.works[KEY].file = "https://example.com/covers/authors/x.v1.jpg")],
    ["a book that is not a work's key", (p: Wire) => (p.works["../etc"] = { file: "/covers/authors/x.v1.jpg", focusY: 30 })],
    ["a focus off the picture", (p: Wire) => (p.works[KEY].focusY = 140)],
    ["a focus that is not a number", (p: Wire) => (p.works[KEY].focusY = "30")],
    ["a book-only mark that is not true", (p: Wire) => (p.works[KEY].bookOnly = "yes")],
    ["a door that is not a slug", (p: Wire) => (p.feelings["<b>love</b>"] = { file: "/covers/feelings/love.v1.jpg", focusY: 30 })],
    ["a door's icon outside /covers/", (p: Wire) => (p.feelings.love.file = "/feelings/love.v1.jpg")],
    ["a map that is not a map", (p: Wire) => ((p as unknown as Record<string, unknown>).works = ["/covers/authors/x.v1.jpg"])],
  ])("throws the whole pack away for %s", async (_label, spoil) => {
    const pack = await good();
    spoil(pack);
    expect(readCoversPack(pack)).toBeNull();
  });

  it("keeps a pack with no reading room maps (the read-aloud covers alone)", async () => {
    const pack = await good();
    delete (pack as Partial<Wire>).works;
    delete (pack as Partial<Wire>).feelings;
    const read = readCoversPack(pack);
    expect(read?.works).toBeUndefined();
    expect(read?.books).toEqual(pack.books);
  });
});

describe("the room, once the pack is in place", () => {
  const PLATE = "isaac-the-syrian/mystic-treatises";
  const COUNCIL = "councils/first-nicaea/the-symbol-of-the-faith";

  it("draws the build's covers until the pack is placed, so the export and its first draw agree", () => {
    const room = buildRoom(false);
    expect(withPackedCovers(room, 0)).toBe(room);
    setCoversPack({ schema: 1, books: { john: "plate" }, figures: {}, works: { [PLATE]: { file: "/covers/authors/isaac-the-syrian.v1.jpg", focusY: 30 } } });
    expect(withPackedCovers(room, 0)).toBe(room);
  });

  it("gives a book the pack names the website's picture, and leaves the rest as the build drew them", () => {
    const room = buildRoom(false);
    const athanasius = room.cards.find((c) => c.key === "athanasius-the-great/on-the-incarnation")!;
    setCoversPack({
      schema: 1,
      books: { john: "plate" },
      figures: {},
      works: { [PLATE]: { file: "/covers/authors/isaac-the-syrian.v1.jpg", focusY: 31 }, [COUNCIL]: { file: "/covers/councils/x.v1.jpg", focusY: 30 } },
      feelings: { love: { file: "/covers/feelings/love.v2.jpg", focusY: 33 } },
    });
    const packed = withPackedCovers(room, 1);
    expect(packed.cards.find((c) => c.key === PLATE)?.cover).toEqual({ src: "/covers/authors/isaac-the-syrian.v1.jpg", focusY: 31 });
    expect(packed.cards.find((c) => c.key === athanasius.key)).toBe(athanasius);
    expect(packed.feelings.find((d) => d.slug === "love")?.cover).toEqual({ src: "/covers/feelings/love.v2.jpg" });
    expect(packed.feelings.find((d) => d.slug === "anger")).toEqual(room.feelings.find((d) => d.slug === "anger"));
    // A book's own page takes the same picture.
    const bare: Pick<Card, "key" | "cover"> = { key: PLATE };
    expect(packedCard(bare, 1).cover?.src).toBe("/covers/authors/isaac-the-syrian.v1.jpg");
    // A council's document keeps its window onto its council's icon.
    const windowed = { key: COUNCIL, cover: { src: "/history/media/a.v1.jpg", focusY: 30, crop: { x: 0.5, y: 0.4, zoom: 2 } } };
    expect(packedCard(windowed, 1)).toBe(windowed);
    expect(packedDoors(room.feelings, 0)).toBe(room.feelings);
  });

  it("never draws a book's own picture beside its byline as the author's face", () => {
    for (const key of Object.keys(WORK_ART)) {
      expect(buildRoom(false).cards.find((c) => c.key === key)?.cover?.bookOnly, key).toBe(true);
    }
    const header = fs.readFileSync("components/reading/BookHeader.tsx", "utf8");
    expect(header).toContain("{card.cover && !card.cover.bookOnly ? <RoundIcon");
    // Both screens that draw room covers read the pack, and draw again when it comes.
    expect(header).toContain("const card = packedCard(built, useCoversVersion());");
    const room = fs.readFileSync("components/reading/ReadingRoom.tsx", "utf8");
    expect(room).toContain("const room = useMemo(() => withPackedCovers(built, placed), [built, placed]);");
  });
});
