// The Ecumenical Councils' screens (1.8), read as source. The owner's pick of
// r3-03 on 2026-10-30: "I like the selection page for A, and I like the Nicaea
// at a glance for C", and the reading room where "Read the Council's
// documents" leads (his build 80 notes 10 to 12). The sheet is
// Homebase/boards/purify-master/variants/r3-03-councils.png.
//
// What a reader would notice if this broke: the councils back to a column of
// text cards, a council's page that has lost its account or its sources, a
// door that opens no shelf, a document that is a plain page again, or a mark
// the owner has turned down (gold, an arrow set as a character, capitals by
// CSS) on any of them.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");

const SELECT = "app/(app)/councils/page.tsx";
const COUNCIL = "app/(app)/councils/[slug]/page.tsx";
const DOCUMENT = "app/(app)/councils/[slug]/[document]/page.tsx";
const SHELF = "app/(app)/reading/councils/[slug]/page.tsx";
const SHELVES = "app/(app)/reading/councils/page.tsx";
const FILES = [
  SELECT,
  COUNCIL,
  DOCUMENT,
  SHELF,
  SHELVES,
  "components/councils/CouncilHero.tsx",
  "components/councils/CouncilFathers.tsx",
  "components/councils/DocumentsDoor.tsx",
  "components/councils/CouncilShelf.tsx",
  "components/councils/CouncilShelves.tsx",
  "components/councils/CouncilBookHeader.tsx",
  "components/councils/CouncilReader.tsx",
];

describe("the selection page (A)", () => {
  const page = code(SELECT);

  it("is the seven as a gallery of bands, then the local councils as rows by year, then the map where it was", () => {
    expect(page).toContain("const { seven, local } = councilsInOrder();");
    expect(page).toMatch(/seven\.map\(\(c, i\) =>[\s\S]*<GalleryBand/);
    expect(page).toMatch(/local\.map\(\(c\) =>[\s\S]*href=\{`\/councils\/\$\{c\.slug\}`\}/);
    expect(page).toContain('<T k="councils.circa" replacements={{ year: c.year }} />');
    // The map and its slider are their own design round: the page keeps them, last.
    expect(page).toContain("<CouncilMap {...councilMap()} />");
    expect(page.indexOf("<CouncilMap")).toBeGreaterThan(page.indexOf("<GalleryBand"));
    // The posture the pages keep, with the way to /about, is still said.
    expect(page).toContain('<T k="study.postureWhereTheFathersSpoke" />');
    expect(page).toContain('href="/about"');
  });

  it("wears its own bar, which the apps' back bar steps aside for", () => {
    expect(page).toMatch(/<MobileTopBar titleKey="councils\.eyebrow" back backFallback="\/discover" revealTitleOn="councils-title" \/>/);
    expect(page).toContain('id="councils-title"');
  });
});

describe("a council's page (C, at a glance)", () => {
  const page = code(COUNCIL);

  it("leads with the icon, the name, the facts, the Fathers one at a time and one door to its books", () => {
    const order = [
      "<CouncilHero",
      'id="council-name"',
      "data-council-facts",
      "c.reception &&",
      "<CouncilFathers fathers={fatherFaces(c, IS_STATIC_EXPORT)} />",
      "<DocumentsDoor",
      '<T k="study.councils.defined" />',
      '<T k="study.councils.historicalContext" />',
      '<T k="study.councils.opposingParties" />',
      '<T k="study.councils.heresiesCondemned" />',
      "<ViewInHistory",
      "data-council-credit",
    ];
    const at = order.map((s) => page.indexOf(s));
    for (const [i, s] of order.entries()) expect(at[i], s).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(page).toContain("href={`/reading/councils/${c.slug}`}");
  });

  it("keeps its bar clear over the icon, and solid with the council's name once the name has gone up", () => {
    expect(page).toMatch(/<MobileTopBar\s+title=\{c\.byname\}\s+back\s+backFallback="\/councils"\s+revealTitleOn="council-name"\s+overlay=\{Boolean\(picture\)\}/);
    expect(code("components/councils/CouncilHero.tsx")).toMatch(/"saint-icon-in under-topbar relative -mx-5/);
    expect(code("components/councils/CouncilHero.tsx")).toContain('"picture-melt"');
  });

  it("draws a Father with no settled picture as a halo and his initial, and the one shown lit in the page's ink, never gold", () => {
    const fathers = code("components/councils/CouncilFathers.tsx");
    // His settled picture, and his name in its place when it cannot come.
    expect(fathers).toContain("const picture = face.picture && failed !== face.picture.src ? face.picture : null;");
    expect(fathers).toMatch(/\{picture \? \(\s*<FacePicture picture=\{picture\}/);
    expect(fathers).toContain('<Halo initial={face.initial} shape={shape} />');
    expect(fathers).toContain('data-father-halo=""');
    expect(fathers).toContain("aria-pressed={on}");
    expect(fathers).toContain("0_0_0_3.5px_var(--color-paper),0_0_18px_3px_rgb(255_255_255/0.3)");
    // A council with one Father has no row to choose from.
    expect(fathers).toContain("fathers.length > 1 ?");
  });

  it("opens its books in the reading room: a door with how many and how long, and a fan of their covers", () => {
    const door = code("components/councils/DocumentsDoor.tsx");
    expect(door).toContain('t("study.councils.readDocuments")');
    expect(door).toContain('tn("councils.booksInRoom", books)');
    expect(door).toContain("readingTime(minutes, t)");
  });
});

describe("a council's books in the reading room", () => {
  it("has a shelf for each council: the room's name in the bar, the council's books over its icon, the other councils under them", () => {
    const shelf = code(SHELF);
    expect(shelf).toContain("<MobileTopBar");
    expect(shelf).toContain('<T k="nav.reading" />');
    expect(shelf).toContain("others={otherCouncilBooks(c.slug, IS_STATIC_EXPORT)}");
    const view = code("components/councils/CouncilShelf.tsx");
    expect(view).toContain('id="shelf-title"');
    expect(view).toMatch(/<WorkCover\b[^>]*crop=\{b\.cover\?\.crop\}/);
    expect(view).toContain('t("councils.shelf.page")');
    expect(view).toContain('<CoverRow id="other-councils" title={t("councils.shelf.others")} seeAll="/reading/councils"');
    expect(code(SHELVES)).toContain("<CouncilShelves shelves={allShelves(IS_STATIC_EXPORT, councilFocus)} />");
  });

  it("opens each document in the room's reader: the book's page above, the chapters, the reader's own type, Start reading and Continue", () => {
    const page = code(DOCUMENT);
    expect(page).toContain("<ReaderPrefsProvider>");
    expect(page).toMatch(/<MobileTopBar\s+title=\{content\.title\}\s+back\s+backFallback=\{`\/reading\/councils\/\$\{c\.slug\}`\}\s+trailing=\{<MobileWorkActions \/>\}\s+revealTitleOn="work-title"/);
    expect(page).toContain("<MobileWorkProgressBar />");
    expect(page).toContain("<CouncilBookHeader");
    expect(page).toContain("<CouncilReader positionKey={positionKey}");
    // Each section at its own address, which a quotation elsewhere opens.
    expect(page).toContain("id={`s${s.n}`}");
    const header = code("components/councils/CouncilBookHeader.tsx");
    expect(header).toContain('<h1 id="work-title"');
    expect(header).toContain("<StartReading saintSlug={positionKey} workSlug={docSlug} first={first} total={total} />");
    const reader = code("components/councils/CouncilReader.tsx");
    expect(reader).toContain("<ChaptersList sections={sections} accordion={false} />");
    expect(reader).toContain("<MobileWorkPill sections={sections} />");
    expect(reader).toContain("FONT_CLASSES[font]} ${SIZE_CLASSES[size]}");
    expect(reader).toContain("savePosition(positionKey, docSlug, best)");
    // Start reading reads the place the reader keeps (components/reading/BookHeader.tsx).
    expect(code("components/reading/BookHeader.tsx")).toContain("export function StartReading(");
  });
});

describe("the councils' screens", () => {
  it("look no word up on the server", () => {
    for (const file of FILES) expect(code(file), file).not.toMatch(/\bgetMessages\b|\bt\(\s*m\s*,/);
  });

  it("draw their marks and never set a character in their place", () => {
    // → ← › ‹ and the decorative curly quote, written as their codes so this file holds none of them.
    const glyphs = [0x2192, 0x2190, 0x203a, 0x2039, 0x201c].map((c) => String.fromCharCode(c));
    for (const file of FILES) {
      const source = code(file);
      for (const g of glyphs) expect(source.includes(g), `${file} draws ${g}`).toBe(false);
    }
  });

  it("carry none of the generic look the owner named, and no gold", () => {
    for (const file of FILES) {
      const source = code(file);
      expect(source, `${file}: the retired display face`).not.toMatch(/font-display-serif/);
      expect(source, `${file}: a side stripe`).not.toMatch(/\bborder-[lrse]-(?:2|4)\b/);
      expect(source, `${file}: capitals by CSS`).not.toMatch(/\buppercase\b/);
      expect(source, `${file}: letter-spaced labels`).not.toMatch(/tracking-(?:wide|wider|widest)\b/);
      expect(source, `${file}: gold`).not.toMatch(/\b(?:text|bg|border|ring|from|to)-(?:gold|yellow|amber|premium)\b/);
    }
  });

  it("move only behind the app's motion switch", () => {
    // The pages keep the account's own hover colours from before 1.8; every
    // component new in 1.8 moves only with motion on.
    for (const file of FILES.filter((f) => f.startsWith("components/"))) {
      const source = code(file);
      for (const m of source.matchAll(/(?<![\w:-])(transition(?:-[a-z]+)?|animate-[a-z-]+|duration-\d+)(?![\w-])/g)) {
        expect(m[1], `${file}: ${m[1]} outside motion-safe:`).toBe("");
      }
    }
  });
});
