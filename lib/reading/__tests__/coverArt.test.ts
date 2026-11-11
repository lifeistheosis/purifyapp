// The pictures on the books' covers (lib/reading/coverArt.ts), held to their
// files and their rights.
//
// What a reader would notice if this broke: a broken picture on a cover, an
// icon nobody ever opened or sourced on the front of a book (covers multiply
// the reach of every icon), or a picture carried inside the apps that should
// have stayed on the website.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";
import { isCcLicence } from "@/lib/credits/photos";
import { streamedUrl } from "@/lib/media/streamed";
import { AUTHOR_COVERS, COUNCIL_COVERS, FEELING_COVERS, WORK_COVERS } from "@/lib/reading/authorCovers";
import { buildRoom } from "@/lib/reading/cards";
import { COVER_ART, WORK_ART, coverSrc } from "@/lib/reading/coverArt";
import { AUTHOR_META, SUBJECTS } from "@/lib/reading/entries";
import { COLLECTION_SLUGS } from "@/lib/reading/feelings";
import { iconRightsFor, isUnverified } from "@/lib/saints/iconRights";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const DIR = path.join(ROOT, "public", "covers", "authors");
/** Every streamed picture the covers carry: the saints', the works' own, the councils' and the feelings' doors'. */
const ALL_STREAMED = () =>
  [...Object.entries(COVER_ART), ...Object.entries(WORK_COVERS), ...Object.entries(COUNCIL_COVERS), ...Object.entries(FEELING_COVERS)].filter(
    (e): e is [string, Extract<(typeof e)[1], { kind: "streamed" }>] => e[1].kind === "streamed",
  );
const PD = /^(public domain|cc0)$/i;
const EM_DASH = String.fromCharCode(0x2014);

describe("the covers' pictures", () => {
  it("are of saints the room knows, or of a Father a council names, whose face it is on its page", () => {
    // 1.9, build 90 note 3: St Memnon has no book in the room; his settled icon is his face at Ephesus.
    const fathers = new Set(COUNCILS.flatMap((c) => (c.principalFathers ?? []).flatMap((f) => (f.slug ? [f.slug] : []))));
    for (const slug of Object.keys(COVER_ART)) expect(Boolean(AUTHOR_META[slug] || SUBJECTS[slug] || fathers.has(slug)), slug).toBe(true);
  });

  it("each have their file, and every file a row", () => {
    // A book with no saint to show carries its own (WORK_COVERS, 1.7.2).
    const streamed = [...Object.values(COVER_ART), ...Object.values(WORK_COVERS)].filter((a) => a.kind === "streamed");
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".jpg"));
    expect(streamed.map((a) => path.basename(a.file)).sort()).toEqual([...files].sort());
    // 1.9, build 89 note 3: a folder each for the councils' icons and the feelings' doors.
    for (const [folder, map] of [["councils", COUNCIL_COVERS], ["feelings", FEELING_COVERS]] as const) {
      const here = fs.readdirSync(path.join(ROOT, "public", "covers", folder)).filter((f) => f.endsWith(".jpg"));
      expect(Object.values(map).map((a) => path.basename(a.file)).sort(), folder).toEqual([...here].sort());
    }
    for (const [, art] of ALL_STREAMED()) {
      expect(art.file, art.file).toMatch(/^\/covers\/(authors|councils|feelings)\/[a-z-]+\.v\d+\.jpg$/);
      const bytes = fs.statSync(path.join(ROOT, "public", art.file)).size;
      expect(bytes, art.file).toBeLessThan(200 * 1024);
      // Each has its lighter copy beside it (lib/media/streamed.ts, avifFor).
      expect(fs.existsSync(path.join(ROOT, "public", art.file.replace(/\.jpg$/, ".avif"))), art.file).toBe(true);
    }
  });

  it("are public domain as their pages state, with every rights field written", () => {
    for (const [slug, art] of ALL_STREAMED()) {
      for (const field of ["alt", "work", "artist", "workDate", "source", "evidenceUrl", "inspectedOn"] as const) {
        expect(art[field]?.trim(), `${slug} ${field}`).toBeTruthy();
        expect(art[field].includes(EM_DASH), `${slug} ${field}`).toBe(false);
      }
      // Public domain or CC0; or, from 1.9, a CC BY or CC BY-SA photograph
      // whose photographer the credits page names (lib/credits/photos.ts).
      expect(PD.test(art.license) || (isCcLicence(art.license) && Boolean(art.credit?.trim())), `${slug}: ${art.license}`).toBe(true);
      expect(art.source, slug).toMatch(/^File:/);
      expect(art.evidenceUrl, slug).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(art.width / art.height, slug).toBeCloseTo(0.8, 2);
      expect(art.width, slug).toBeGreaterThanOrEqual(480);
    }
    // The Commons rows are one source among the covers, under the same rules.
    for (const slug of Object.keys(AUTHOR_COVERS)) expect(COVER_ART[slug], slug).toBe(AUTHOR_COVERS[slug]);
  });

  it("from the app's own icons, are only those whose rights are settled", () => {
    for (const [slug, art] of Object.entries(COVER_ART)) {
      if (art.kind !== "bundled") continue;
      expect(iconRightsFor(art.file), `${slug}: ${art.file} has no settled rights`).not.toBeNull();
      expect(isUnverified(art.file), slug).toBe(false);
      expect(fs.existsSync(path.join(ROOT, "public", art.file)), art.file).toBe(true);
    }
  });

  it("show the face in the cover's window", () => {
    for (const [slug, art] of Object.entries(COVER_ART)) {
      expect(art.focusY, slug).toBeGreaterThanOrEqual(0);
      expect(art.focusY, slug).toBeLessThanOrEqual(100);
    }
  });

  it("are asked of the website in the apps, as every streamed file is", () => {
    for (const art of Object.values(COVER_ART)) {
      expect(coverSrc(art, false)).toBe(art.file);
      expect(coverSrc(art, true)).toBe(art.kind === "streamed" ? streamedUrl(art.file, true) : art.file);
    }
  });

  it("give a book a picture of its own (an anonymous book, a council's icon, a saint of the text), and only a book the room carries", () => {
    const cards = new Map(buildRoom(false).cards.map((c) => [c.key, c]));
    for (const [key, art] of Object.entries(WORK_ART)) {
      expect(cards.get(key as never)?.cover?.src, key).toBe(coverSrc(art, false));
    }
    for (const key of Object.keys(WORK_COVERS)) expect(WORK_ART[key], key).toBe(WORK_COVERS[key]);
    // Every council's icon is on a book: none is cut for nothing.
    const used = new Set(Object.values(WORK_ART).map((a) => a.file));
    for (const [council, art] of Object.entries(COUNCIL_COVERS)) expect(used.has(art.file), council).toBe(true);
    // A council's icon or a borrowed cover never stands for the saint himself elsewhere (coverArtFor).
    const own = new Set(Object.values(COVER_ART).map((a) => a.file));
    for (const art of Object.values(COUNCIL_COVERS)) expect(own.has(art.file), art.file).toBe(false);
  });

  it("are the only pictures on a cover: no unopened icon reaches one", () => {
    const allowed = new Set([...Object.values(COVER_ART), ...Object.values(WORK_ART)].map((a) => a.file));
    for (const card of buildRoom(false).cards) {
      if (card.cover) expect(allowed.has(card.cover.src), `${card.key}: ${card.cover.src}`).toBe(true);
    }
  });

  it("give every work a picture, but the named few still waiting for one (build 93 note 18)", () => {
    // His word, 2026-11-11 (build 93 notes 12 and 18): "Ensure every single
    // saint has a icon photo", and of the reading room, "There's some works
    // where the cover doesn't have photos." So every work wears a picture:
    // its saint's, or by build 89's covers rule a saint of its own text who
    // has one, or a council's for one of its Fathers (WORK_ART). A book with
    // none stands here by name with what it waits for; the pre-build gate
    // lets through only those that wait on a permission (CLAUDE.md, "No test
    // build reaches him until it passes the pre-build gate", part 3). Each
    // leaves this list in the commit that gives it its picture.
    const WAITING: Record<string, string> = {
      // St John of Shanghai's Life waited here on a permission until it took
      // his photograph of 1939 (2026-11-11), free and shown so in its row.
      // Updates 2's search (build 93 note 12): no picture of these saints has
      // passed, and their texts name no saint who has one. Zurbaran's "St
      // Romanus" is a Benedictine monk of that name, not the martyr.
      "marcian-of-cyrrhus/life-of-marcian": "search: Updates 2, build 93 note 12",
      "zacchaeus-and-alphaeus/martyrdom-of-zacchaeus-and-alphaeus": "search: Updates 2, build 93 note 12",
      // Updates 2's, from before November: St Irenaeus's and St Irene's
      // carried icons have no recorded source, and St Symeon's no old icon
      // passed. St Isaac's book waited here for his settled icon until build
      // 93 note 12 put it on (2026-11-11).
      "irenaeus-of-lyons/against-heresies-on-john": "search: Updates 2, build 93 note 12",
      "irene-the-empress/letters-for-the-seventh-council": "search: Updates 2, build 93 note 12",
      "symeon-the-new-theologian/discourse-on-faith": "search: Updates 2, build 93 note 12",
      // January's saints (1.9): the Prophet Micaiah's book waits with him on
      // the plate. No free picture of him passed (docs/1.9-build/notes/
      // january-saints.md, push 2): the Lives of 1903 to 1911 picture no one
      // on his day, and Commons' one old picture of him, Weigel's engraving of
      // 1695, shows Sedecias striking him, not the prophet himself.
      "prophet-micaiah/micaiah-before-ahab": "search: January push 2, no free picture of him",
    };
    const plate = buildRoom(false)
      .cards.filter((c) => !c.cover)
      .map((c) => c.key)
      .sort();
    expect(plate).toEqual(Object.keys(WAITING).sort());
    for (const [key, why] of Object.entries(WAITING)) expect(why, key).toMatch(/^(permission|his word|search|cover): ./);
  });

  it("give every How you feel door its saint's icon, asked of the website in the apps", () => {
    expect(Object.keys(FEELING_COVERS).sort()).toEqual([...COLLECTION_SLUGS].sort());
    for (const native of [false, true]) {
      for (const door of buildRoom(native).feelings) {
        expect(door.cover?.src, door.slug).toBe(coverSrc(FEELING_COVERS[door.slug], native));
      }
    }
    // The door waits for its icon as a cover does, and stands as before without it.
    const row = fs.readFileSync(path.join(ROOT, "components/reading/FeelingsRow.tsx"), "utf8");
    expect(row).toContain("HOLD_MS");
    expect(row).toContain("aspect-[4/5]");
    expect(row).toContain("styles.door");
  });
});
