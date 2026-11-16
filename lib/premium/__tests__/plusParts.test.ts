// The Plus page shows each part as it looks (1.9, round 3 of the fifteen
// screens). What a reader would notice if this broke: the eight boxed cards
// with their icon tiles back; a "Try it" that opens nothing; a specimen
// showing words nobody wrote, a picture the journal does not offer, or a
// sound, a palette or a chant that is not the app's; and a reader with no
// plan sent from Your plan to the old table of ticks inside the apps.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { TRY_PREVIEW_IDS } from "@/components/billing/PlusTry";
import { AMBIENCE_TRACKS } from "@/lib/ambience/ambience";
import { DOWNLOADABLE_BIBLES } from "@/lib/bible/downloads/catalog";
import { chantBySlug } from "@/lib/chants/registry.server";
import { CHANT_SAVING } from "@/lib/chants/saving";
import { coverById } from "@/lib/journal/covers";
import {
  PART_COMPARE,
  PART_COVERS,
  PART_FRAMES,
  PART_MODES,
  PART_OFFLINE,
  PART_REFS,
  PART_SOUNDS,
  PART_SPECIMENS,
  PART_WORD,
  isPartSpecimen,
} from "@/lib/premium/plusParts";
import { PLUS_ROWS, rowLeads } from "@/lib/premium/plusRows";
import { TRY_CHAPTER, TRY_PALETTES, TRY_REF_VERSES, TRY_WORDS } from "@/lib/premium/plusTry";
import { TRY_COMPARE_BIBLES } from "@/lib/premium/tryCompare";
import { DECORATIONS } from "@/lib/profile/cosmetics";
import { READING_THEMES } from "@/lib/reader/readingModes";
import { JOHN_1_OPENING } from "@/lib/settings/preview";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
/** A file's code, without its comments. */
const code = (file: string) => read(file).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const json = <T,>(file: string) => JSON.parse(read(file)) as T;

const PARTS = "components/billing/PlusParts.tsx";

describe("the parts of Plus, each shown as it looks", () => {
  it("shows a specimen only for a row of the list, and every row can still be tried", () => {
    const ids = PLUS_ROWS.map((r) => r.id);
    for (const id of PART_SPECIMENS) expect(ids, id).toContain(id);
    expect(new Set(PART_SPECIMENS).size).toBe(PART_SPECIMENS.length);
    for (const row of PLUS_ROWS) expect(TRY_PREVIEW_IDS, row.id).toContain(row.id);
    expect(isPartSpecimen("word-study")).toBe(true);
    expect(isPartSpecimen("sync")).toBe(false);
  });

  it("draws every specimen it names, and nothing else", () => {
    const parts = code(PARTS);
    const drawn = parts.slice(parts.indexOf("const SPECIMENS"), parts.indexOf("};", parts.indexOf("const SPECIMENS")));
    for (const id of PART_SPECIMENS) expect(drawn, id).toMatch(new RegExp(`(?:^|\\s)"?${id}"?: \\w+Specimen,`, "m"));
    expect(drawn.match(/: \w+Specimen,/g)).toHaveLength(PART_SPECIMENS.length);
  });

  it("is no row of boxed cards: no icon tile, no box, no separate Try it, and the whole piece is the button", () => {
    const parts = code(PARTS);
    for (const gone of ["FeatureMark", "FeaturePicture", "FeatureRow", "ICON_TILE", "plus.try.open", "ring-paper/[0.08]", "bg-paper/[0.035]"]) {
      expect(parts, gone).not.toContain(gone);
    }
    // One button a part, named by the part's own name and line, with the mark of a piece that opens.
    expect(parts.match(/<button\b/g)).toHaveLength(1);
    expect(parts).toContain("data-plus-try-open={row.id}");
    expect(parts).toContain("{t(row.name)}");
    expect(parts).toContain("{t(row.body)}");
    expect(parts).toContain("<ChevronRight");
    // A hairline between, and where a tried part is found again (components/billing/PlusTry.tsx, bringRowBack).
    expect(parts).toContain("divide-y divide-paper/10");
    expect(parts).toContain("data-plus-feature={row.id}");
    // A specimen is a picture of the part: unseen by a screen reader, and never in the way of the tap.
    expect(parts).toMatch(/<span aria-hidden data-plus-specimen=\{id\} className="pointer-events-none/);
    // What stays free is still said under the list.
    expect(parts).toContain('t("plus.general.keep")');
  });

  it("stands on the Plus page in the apps and on the website", () => {
    const page = code("components/billing/PlusPaywall.tsx");
    expect(page.match(/<PlusParts onTry=\{tryer\.start\} \/>/g)).toHaveLength(2);
    expect(page).not.toContain("PlusFeatureRows");
    // The opening picture, the plans' dock and the owned state are as they were.
    for (const kept of ['<KeptHero place="screen"', "<PlansDock", "<PlusOwnedFoot", "<SignedOutFoot"]) expect(page, kept).toContain(kept);
  });

  it("is what the header's Plus button shows too, so both doors to Plus show the same; a lock's own row still leads its sheet", () => {
    // The header's button opens the sheet with "general" (components/nav/MobilePremiumButton.tsx),
    // which leads no row: the sheet then shows the parts, as the Plus page does.
    expect(code("components/nav/MobilePremiumButton.tsx")).toContain('upgrade.open("general")');
    expect(rowLeads("general", { desktopApp: false })).toBe(false);
    expect(rowLeads(null, { desktopApp: false })).toBe(false);
    // A lock with a row of its own still leads, lit in its words, the first row included.
    for (const lock of ["wordstudy", "journal", "profile"]) expect(rowLeads(lock, { desktopApp: false }), lock).toBe(true);
    const sheet = code("components/billing/UpgradeModal.tsx");
    expect(sheet).toContain("const ledBy = rowLeads(feature, { desktopApp });");
    expect(sheet).toMatch(
      /\{ledBy \? \(\s*<PlusFeatureRows lead=\{feature\} onTry=\{tryer\.start\} className="mt-4" \/>\s*\) : \(\s*<PlusParts onTry=\{tryer\.start\} className="mt-4" \/>\s*\)\}/,
    );
    // The old rows ask the same question, so the two can never disagree on what leads.
    expect(code("components/billing/KeptPaywall.tsx")).toContain("const ledBy = rowLeads(lead, { desktopApp });");
  });
});

describe("what each specimen shows is the app's own", () => {
  it("word study: a verse of the chapter the previews open, in the page's own opening, and the word the study opens on", () => {
    expect(PART_WORD.book).toBe(TRY_CHAPTER.book);
    expect(PART_WORD.chapter).toBe(TRY_CHAPTER.chapter);
    expect(PART_WORD.strongs).toBe(TRY_WORDS[0].strongs);
    const john = json<{ verses: { n: number; text: string }[] }>("data/bible/john/1.json");
    const verse = JOHN_1_OPENING.find((v) => v.n === PART_WORD.verse);
    expect(verse?.text).toBe(john.verses.find((v) => v.n === PART_WORD.verse)?.text);
    // The Greek is read from the chapter's own file, never written here.
    const parts = code(PARTS);
    expect(parts).toContain("loadInterlinear(PART_WORD.book, PART_WORD.chapter)");
    expect(parts).not.toMatch(/[Ͱ-Ͽἀ-῿]/);
  });

  it("the reading modes: three palettes Plus adds, each one the Try preview holds to the stylesheet", () => {
    expect(PART_MODES).toHaveLength(3);
    for (const id of PART_MODES) {
      expect(TRY_PALETTES, id).toHaveProperty(id);
      const mode = READING_THEMES.find((m) => m.id === id);
      expect(mode?.labelKey, id).toBeTruthy();
      expect(read("app/globals.css"), id).toContain(`.set-mode-page[data-palette="${id}"]`);
    }
    // Dark is every reader's: it is not shown as a part of Plus.
    expect(PART_MODES as readonly string[]).not.toContain("default");
    expect(code(PARTS)).toContain("<ModePage palette={id}");
  });

  it("cross-references: a verse the Try preview offers, in the page's opening, its places read from the chapter's file", () => {
    expect(TRY_REF_VERSES).toContain(PART_REFS.verse);
    expect(JOHN_1_OPENING.some((v) => v.n === PART_REFS.verse)).toBe(true);
    expect(PART_REFS.most).toBeGreaterThan(1);
    expect(code(PARTS)).toContain("/bible-data/crossrefs/${PART_REFS.book}/${PART_REFS.chapter}.json");
  });

  it("the journal: three covers its picker offers, carried in the apps", () => {
    expect(PART_COVERS).toHaveLength(3);
    expect(new Set(PART_COVERS).size).toBe(3);
    for (const file of PART_COVERS) {
      expect(coverById(file)?.src, file).toBe(`/saints/icons/${file}`);
      expect(fs.existsSync(path.join(process.cwd(), "public/saints/icons", file)), file).toBe(true);
    }
  });

  it("listen offline: the Anthem's own cover and name, and only while keeping a chant is part of Plus", () => {
    if (CHANT_SAVING !== "plus") {
      expect(PART_OFFLINE).toBeNull();
      return;
    }
    expect(PART_OFFLINE).not.toBeNull();
    const chant = chantBySlug(PART_OFFLINE!.slug);
    expect(chant?.key).toBe(PART_OFFLINE!.key);
    expect(chant?.cover?.src).toBe(PART_OFFLINE!.cover);
    // The player's own line for a saved recording.
    expect(code(PARTS)).toContain('t("player.offline.saved", { book: t(chantTitleKey(PART_OFFLINE.key)) })');
  });

  it("ambience, Compare and the profile: the sounds, the Bible and the frames the app has", () => {
    expect(AMBIENCE_TRACKS.length).toBeGreaterThanOrEqual(PART_SOUNDS);
    expect(DOWNLOADABLE_BIBLES.some((b) => b.id === PART_COMPARE)).toBe(true);
    expect(TRY_COMPARE_BIBLES.some((r) => r.bible === PART_COMPARE)).toBe(true);
    expect(DECORATIONS.length).toBeGreaterThanOrEqual(PART_FRAMES);
  });

  it("every word a specimen says is in the English catalog", () => {
    const en = json<Record<string, string>>("lib/i18n/messages/en.json");
    const keys = [
      "bible.books.john",
      "bible.chapterN",
      "bible.crossRefsFor",
      "bible.books.psalms",
      "player.offline.saved",
      "nav.you",
      "plus.general.keep",
      "plus.sheet.title",
      ...AMBIENCE_TRACKS.slice(0, PART_SOUNDS).map((s) => s.labelKey),
      ...DECORATIONS.slice(0, PART_FRAMES).map((d) => `profile.frameName.${d}`),
      ...PART_MODES.map((id) => READING_THEMES.find((m) => m.id === id)?.labelKey ?? ""),
    ];
    for (const key of keys) expect(en[key], key).toBeTruthy();
  });
});

describe("one Plus page in the apps", () => {
  it("sends a reader with no plan from Your plan to the page their Plus button opens", () => {
    const plan = code("components/premium/PlanScreen.tsx");
    expect(plan).toContain('return isNativeClient() ? "/pricing" : "/premium";');
    expect(plan).toContain("const NO_PLAN = noPlan();");
    expect(plan).toContain("router.replace(NO_PLAN)");
    // The same two places the header's button leads.
    expect(code("components/nav/MobilePremiumButton.tsx")).toContain('isNative ? "/pricing" : "/premium"');
  });

  it("keeps the older page for the website", () => {
    expect(fs.existsSync(path.join(process.cwd(), "app/(app)/premium/page.tsx"))).toBe(true);
  });
});
