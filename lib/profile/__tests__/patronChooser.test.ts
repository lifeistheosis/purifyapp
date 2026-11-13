// The patron saint's chooser (build 95 note 17). The owner's word, 2026-11-13,
// with a screenshot of Settings, The calendar, Patron saint, open: "patron saint
// chooser design needs a rework".
//
// What the screenshot showed: the generic searchable dropdown
// (components/ui/SearchSelect.tsx), a field over a long list of bare names in
// the order the website sent them, opened over the Language section and running
// to the foot of the screen with the page's own words under its last row; the
// apostles all under H as "Holy Apostle ...", the prophets under T as "The
// Prophet ...", and no saint with his picture.
//
// What it holds: one chooser wherever a patron is chosen (Settings, the
// reader's own page, the computer's Data tab, the Community profile's editor),
// made of the app's own pieces (the house's sheet, as tall as the screen the
// keyboard leaves; the one search field; each saint as the Saints list draws
// him, his icon on the house's plate); each saint lettered and sorted by his
// own name and found by any part of it; every saint with the picture his own
// page shows, or on the plate while it waits on a permission; and only the
// saints the website will save.
//
// What a reader would notice if this broke: St. John the Theologian looked for
// under J and found under H among fourteen others, a saint with no face, or a
// list that runs under the keyboard and off the foot of the screen.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import profiledSaints from "@/data/calendar/profiled-saints.json";
import type { Patron } from "@/lib/profile/patrons";
import type { SaintBrief } from "@/lib/saints/brief";
import { SAINTS } from "@/lib/saints/saints";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

const BRIEF = profiledSaints as SaintBrief[];

// Loaded as each test runs rather than at the top, so that on the old code,
// which had no such list, every test here fails on its own claim.
let byLetter: typeof import("@/lib/profile/patrons").byLetter;
let findPatrons: typeof import("@/lib/profile/patrons").findPatrons;
let ownName: typeof import("@/lib/profile/patrons").ownName;
let patronFor: typeof import("@/lib/profile/patrons").patronFor;
let patronList: typeof import("@/lib/profile/patrons").patronList;
/** Every saint the library carries, as the website would offer him (/api/saints/patrons). */
let ALL: Patron[] = [];
const at = (slug: string) => {
  const p = ALL.find((x) => x.slug === slug);
  if (!p) throw new Error(`${slug} is not offered`);
  return p;
};

describe("the patron saint's chooser", () => {
  beforeAll(async () => {
    ({ byLetter, findPatrons, ownName, patronFor, patronList } = await import("@/lib/profile/patrons"));
    ALL = patronList(BRIEF.map((s) => ({ slug: s.slug, name: s.name })));
  });

  it("offers every saint the library carries with a feast day", () => {
    expect(ALL.length).toBe(BRIEF.filter((s) => s.feastDays.length > 0).length);
    expect(new Set(ALL.map((p) => p.slug)).size).toBe(ALL.length);
  });

  it("letters each saint by his own name: the apostles under their own letters, none under a word of honour", () => {
    expect(at("apostle-john").letter).toBe("J");
    expect(at("john-the-baptist").letter).toBe("J");
    expect(at("apostle-matthew").letter).toBe("M");
    expect(at("apostle-andrew").letter).toBe("A");
    expect(at("apostle-paul").letter).toBe("P");
    expect(at("archangel-michael").letter).toBe("M");
    expect(at("mary-of-egypt").letter).toBe("M");
    expect(at("theotokos").letter).toBe("T");
    expect(ownName("Holy Apostle and Evangelist John")).toBe("John");
    expect(ownName("Holy Prophet, Forerunner, and Baptist John")).toBe("John");
    expect(ownName("The Prophet Daniel and the Three Holy Youths")).toBe("Daniel and the Three Holy Youths");
    expect(ownName("Saints Cyril and Methodius")).toBe("Cyril and Methodius");
    expect(ownName("St. Mary of Egypt")).toBe("Mary of Egypt");
    for (const p of ALL) {
      expect(p.own, p.name).not.toMatch(/^(The|Most|Holy|St\.?|Sts\.?|Saints?|Apostles?|Prophet|Archangel|Blessed|and)\s/);
      expect(p.letter, p.name).toMatch(/^[A-Z]$/);
    }
    // The old list's H: four saints whose names begin with H, and fifteen apostles and a prophet with them.
    const h = ALL.filter((p) => p.letter === "H").map((p) => p.name);
    expect(h.filter((n) => /^Holy /.test(n))).toEqual([]);
  });

  it("is sorted by that name, the letters A to Z, each once", () => {
    const owns = ALL.map((p) => p.own);
    expect([...owns].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))).toEqual(owns);
    const letters = byLetter(ALL).map(([letter]) => letter);
    expect(letters).toEqual([...letters].sort());
    expect(new Set(letters).size).toBe(letters.length);
    expect(byLetter(ALL).flatMap(([, group]) => group)).toEqual(ALL);
    // St. Andrew stands among the A's, after St. Anatolius and before St. Anthony.
    const a = byLetter(ALL).find(([letter]) => letter === "A")?.[1].map((p) => p.slug) ?? [];
    expect(a.indexOf("apostle-andrew")).toBeGreaterThan(a.indexOf("anatolius-of-constantinople"));
    expect(a.indexOf("apostle-andrew")).toBeLessThan(a.indexOf("anthony-the-great"));
  });

  it("finds any part of a name, its accents off, and the forms a saint is known by", () => {
    const egypt = findPatrons(ALL, "egypt").map((p) => p.slug);
    expect(egypt).toContain("mary-of-egypt");
    expect(findPatrons(ALL, "EGYPT").map((p) => p.slug)).toEqual(egypt);
    expect(findPatrons(ALL, "staniloae").map((p) => p.slug)).toContain("dumitru-staniloae");
    expect(findPatrons(ALL, "theologian").map((p) => p.slug)).toEqual(expect.arrayContaining(["apostle-john", "gregory-theologian"]));
    expect(findPatrons(ALL, "forerunner").map((p) => p.slug)).toContain("john-the-baptist");
    expect(findPatrons(ALL, "no saint is called this")).toEqual([]);
    expect(findPatrons(ALL, "  ")).toEqual(ALL);
    // The saints whose own name begins with the words typed come first, each
    // part in the list's own order: "john" opens on the Apostle and the
    // Forerunner, and Sts. Cyrus and John come after every John.
    const john = findPatrons(ALL, "john");
    expect(john.slice(0, 2).map((p) => p.slug)).toEqual(["apostle-john", "john-the-baptist"]);
    const begins = john.findIndex((p) => !/^john/i.test(p.own));
    expect(begins).toBeGreaterThan(2);
    expect(john.slice(begins).every((p) => !/^john/i.test(p.own))).toBe(true);
    expect(john.map((p) => p.slug)).toContain("cyrus-and-john");
    const inOrder = (part: Patron[]) => expect(part.map((p) => p.slug)).toEqual(ALL.filter((p) => part.some((x) => x.slug === p.slug)).map((p) => p.slug));
    inOrder(john.slice(0, begins));
    inOrder(john.slice(begins));
  });

  it("draws each saint with the picture his own page shows, or on the plate while it waits on a permission", () => {
    const registry = new Map<string, string | null>();
    for (const s of SAINTS) registry.set(s.slug, registry.get(s.slug) ?? s.iconUrl ?? null);
    for (const p of ALL) {
      expect(p.icon, p.slug).toBe(registry.get(p.slug) ?? null);
      if (p.icon) expect(existsSync(join(process.cwd(), "public", p.icon)), p.icon).toBe(true);
    }
    // On the plate: exactly the saints whose own pages have no picture, whom
    // lib/saints/__tests__/everySaintAPicture.test.ts holds to the named list
    // of permissions awaited (the pre-build gate's part 3).
    const plate = ALL.filter((p) => !p.icon).map((p) => p.slug).sort();
    const without = [...registry].filter(([, icon]) => !icon).map(([slug]) => slug).sort();
    expect(plate).toEqual(without);
  });

  it("gives each saint his first feast, the one a name day keeps", () => {
    for (const p of ALL) expect(p.feast, p.slug).toBe(BRIEF.find((s) => s.slug === p.slug)?.feastDays[0]);
    expect(at("apostle-john").feast).toBe("May 8");
  });

  it("offers only the saints the website will save, and names a chosen one this build does not carry", () => {
    const main = [
      { slug: "mary-of-egypt", name: "St. Mary of Egypt" },
      { slug: "apostle-john", name: "Holy Apostle and Evangelist John" },
      { slug: "a-saint-of-a-later-release", name: "St. Nectarios of a Later Release" },
    ];
    expect(patronList(main).map((p) => p.slug)).toEqual(["apostle-john", "mary-of-egypt"]);
    expect(patronFor("a-saint-of-a-later-release", "St. Nectarios of a Later Release")).toMatchObject({ name: "St. Nectarios of a Later Release", icon: null, feast: null });
    expect(patronFor("a-saint-of-a-later-release")).toBeNull();
    expect(patronFor("")).toBeNull();
    expect(patronFor("apostle-john")?.icon).toBe(at("apostle-john").icon);
  });

});

describe("the patron saint's chooser, as drawn", () => {
  it("is the house's sheet, the one search field and the saints' own icons, never the dropdown", () => {
    const chooser = read("components/profile/PatronChooser.tsx");
    // As tall as the screen the keyboard leaves (lib/ui/viewport.ts), on a computer too.
    expect(chooser).toMatch(/<Sheet\s[^>]*?\bfill\b[^>]*?\bdesktop\b/);
    expect(chooser).toMatch(/lead=\{\s*<div[^>]*>\s*<SearchField /);
    expect(chooser).toContain('<SaintIcon saint={{ name: p.name, iconUrl: p.icon ?? undefined }} size="xs" />');
    expect(chooser).toContain("<FacePlate");
    // A search reads from its first match: each letter typed puts the list
    // under the field back at its top, wherever the full list was scrolled.
    expect(chooser).toMatch(/<SearchField value=\{query\} onChange=\{type\}/);
    expect(chooser).toContain("toTop(results.current)");
    // The reader's own saint is in view as the sheet opens.
    expect(chooser).toContain(`querySelector<HTMLElement>('[aria-current="true"]')`);
    expect(chooser).not.toMatch(/from "@\/components\/ui\/SearchSelect"|<SearchSelect/);
    // The icon's own shape, three wide by four tall, for a row of a list.
    expect(read("components/saints/SaintIcon.tsx")).toContain('xs: { w: 48, h: 64, plate: "thumb" }');
  });

  it("is the one chooser wherever a patron is chosen", () => {
    const picker = read("components/profile/PatronSaintPicker.tsx");
    expect(picker).toContain("<PatronChooser ");
    expect(picker).not.toMatch(/from "@\/components\/ui\/SearchSelect"|<SearchSelect/);
    // Settings, the reader's own page and the computer's Data tab draw the picker.
    expect(read("components/settings/PatronRow.tsx")).toContain("<PatronSelect choice={choice} />");
    expect(read("components/profile/ProfileTabClient.tsx")).toContain("<PatronSaintPicker />");
    expect(read("app/(app)/account/(signed)/data/page.tsx")).toContain("<PatronSaintPicker />");
    // The Community profile's editor chooses with it too, into its draft.
    const editor = read("components/community/profile/ProfileEditor.tsx");
    const start = editor.indexOf('<Field label={t("profile.patronSaint")}>');
    const field = editor.slice(start, editor.indexOf("</Field>", start));
    expect(start).toBeGreaterThan(0);
    expect(field).toContain("<PatronChooser");
    expect(field).not.toContain("<SearchSelect");
  });
});
