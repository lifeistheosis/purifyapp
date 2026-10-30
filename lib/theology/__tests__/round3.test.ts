// Theology, round 3 (1.8, r3-04): the owner's pick of 2026-10-30, "For
// theology, we should do one A, two B and C, hybrid, three, C"
// (Homebase/boards/purify-master/variants/r3-04-theology, INDEX.md), from
// his build 80 notes 21, 23 and 24 (r18/BUILD-80-NOTES.md).
//
// What a reader would notice if this broke: a subject's card opening to a
// cloud of pills again, a doctrine's page without its doors or its deck, the
// search back at the very foot of the hub, a pill that hides the last line
// of a page or sits under the mini player, or motion while Purify's motion
// is off. Read as text: the components are server ones, and the built pages
// are measured in the export walk.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { THEOLOGY_SECTIONS, searchLibrary, type TheologySearchItem } from "@/lib/theology/searchKinds";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
/**
 * A file's code without its notes. A JSX note is matched only up to its own
 * end, so it cannot run on from a type's doc comment to the next note.
 */
const code = (file: string) =>
  read(file)
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const EN = JSON.parse(read("lib/i18n/messages/en.json")) as Record<string, string>;

const FAITH_MAP = "components/theology/FaithMap.tsx";
const HUB = "app/(app)/theology/page.tsx";
const DOCTRINE = "app/(app)/theology/[topic]/page.tsx";
const READER = "components/theology/TopicReader.tsx";
const DOORS = "components/theology/DoctrineDoors.tsx";
const DECK = "components/theology/FathersDeck.tsx";
const SEARCH = "components/theology/TheologySearch.tsx";
const SHELF = "components/theology/FathersShelf.tsx";
const RAIL = "components/theology/RelatedRail.tsx";

describe("1, opening a card: A, Contents", () => {
  const map = code(FAITH_MAP);

  it("opens to a raised tray of rows, not a cloud of pills", () => {
    expect(map).toContain('data-faith-tray=""');
    expect(map).toMatch(/className="band-open theology-tray /);
    expect(map).toContain('className="faith-rows"');
    expect(map).toContain("theology-row ");
    // The pills it had: rounded-full links in a wrapping row.
    expect(map).not.toMatch(/flex-wrap/);
    expect(map).not.toMatch(/<Link[^>]*rounded-full/);
  });

  it("names each kind once, with how many, from the catalog in the reader's language", () => {
    expect(map).toContain("<T k={`study.theology.tray.${g.kind}`} count={g.rows.length} />");
    for (const kind of ["questions", "studies", "errors", "councils"]) {
      expect(map).toContain(`kind: "${kind}" as const`);
      expect(EN[`study.theology.tray.${kind}.one`], kind).toBeTruthy();
      expect(EN[`study.theology.tray.${kind}.other`], kind).toBeTruthy();
    }
    // The question with its citations, a study with its length.
    expect(map).toContain('<T k="topics.citations" count={topic.citations.length} />');
    expect(map).toContain('<T k="bible.minRead" replacements={{ minutes: meta.estimatedMinutes }} />');
  });

  it("lies over its subject's own icon, blurred and grey, which never moves", () => {
    expect(map).toContain('className="faith-tray-glow" style={{ backgroundImage: `url(${s.picture.src})` }}');
    const glow = /\.faith-tray-glow\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(glow).toMatch(/filter:\s*blur\(36px\) grayscale\(1\)/);
    expect(glow).not.toMatch(/animation|transition/);
  });
});

describe("2, a doctrine's own page: B and C as one page", () => {
  const page = code(DOCTRINE);
  const reader = code(READER);
  const doors = code(DOORS);
  const deck = code(DECK);

  it("has the bar clear over C's cover, its title arriving once the page's has gone", () => {
    expect(page).toMatch(/<MobileTopBar[\s\S]*?revealTitleOn="doctrine-title"[\s\S]*?overlay/);
    expect(reader).toContain('id="doctrine-title"');
    expect(reader).toContain('className="doctrine-cover saint-icon-in under-topbar ');
    expect(page).not.toContain("TheologyArticleNav");
  });

  it("leads with C's Read the study, which opens the study's door", () => {
    expect(reader).toMatch(/<ReadTheStudy doors=\{doors\} minutes=\{minutes\} \/>[\s\S]*<DoctrineDoors doors=\{doors\} panels=\{panels\} \/>/);
    expect(doors).toContain('onClick={() => openDoctrineDoor("study", doors)}');
    expect(EN["study.theology.readStudy"]).toBe("Read the study");
  });

  it("pins the doors as a slim row of whole labels, never cut (build 83)", () => {
    // The walk at 390px found "The s...", "The F...", "Scrip...", "Relat...".
    const slim = doors.slice(doors.indexOf('data-doctrine-slim=""'), doors.indexOf('id="doctrine-panels"'));
    expect(slim.length).toBeGreaterThan(0);
    expect(slim).not.toContain("DoorIcon");
    expect(slim).not.toContain("truncate");
    expect(slim).toContain('<span data-slim-label="" className="doctrine-slim-label">');
    const SLIM = /const SLIM =\s*"([^"]+)"/.exec(doors)?.[1] ?? "";
    expect(SLIM).toContain("doctrine-slim-door");
    expect(SLIM).toContain("leading-[1.1]");
    expect(SLIM).not.toMatch(/\btruncate\b|text-detail/);
    // The doors share the row, and none is narrower than its longest word.
    expect(css).toMatch(/\.doctrine-slim-door\s*\{\s*min-width:\s*min-content;\s*font-size:\s*var\(--slim-size\);\s*\}/);
    expect(css).toMatch(/\.doctrine-slim\s*\{\s*--slim-size:\s*13px;\s*\}/);
    expect(css).toMatch(/\.doctrine-slim\[data-squeezed\] \.doctrine-slim-label\s*\{\s*overflow-wrap:\s*anywhere;\s*\}/);
    // Fitted again when the words change language, the screen its width, or the fonts arrive.
    expect(doors).toMatch(/const fit = \(\) => fitSlimRow\(row\);[\s\S]*?document\.fonts\?\.ready[\s\S]*?addEventListener\("resize", fit\)[\s\S]*?\}, \[many, labels\]\);/);
  });

  it("fits the longest of the 21 catalogs' four labels at 360px, by a generous estimate of their width", () => {
    // The row at 360px: 16px each side, its border and 4px padding, three
    // 4px gaps, and 4px each side of every door, leave 274px for the four
    // labels' longest words side by side (each label wraps between its
    // words). A glyph is taken as 0.62 of its size, wider than DM Sans's
    // and Noto Sans's average in every script here; fitSlimRow measures
    // the real ones on the device.
    const room = 360 - 2 * 16 - 2 - 2 * 4 - 3 * 4 - 4 * 2 * 4;
    const keys = ["study.theology.door.study", "footer.theFathers", "study.history.category.scripture.label", "study.related"];
    const dir = path.join(ROOT, "lib/i18n/messages");
    const worst: string[] = [];
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const messages = JSON.parse(read(`lib/i18n/messages/${file}`)) as Record<string, string>;
      const longest = keys.map((k) => {
        expect(messages[k], `${file}: ${k}`).toBeTruthy();
        return Math.max(...messages[k].split(/\s+/).map((w) => [...w].length));
      });
      const letters = longest.reduce((a, b) => a + b, 0);
      // The size it would be set at, by this estimate.
      const size = Math.min(13, Math.floor((room / (letters * 0.62)) * 2) / 2);
      if (size < 11) worst.push(`${file}: ${letters} letters, ${size}px`);
    }
    expect(worst, "a language whose labels would come down below 11px at 360px").toEqual([]);
  });

  it("has B's four doors, labelled in the reader's language, the Fathers' door holding C's deck", () => {
    for (const key of ["study.theology.door.study", "footer.theFathers", "study.history.category.scripture.label", "study.related"]) {
      expect(doors).toContain(`"${key}"`);
      expect(EN[key], key).toBeTruthy();
    }
    expect(reader).toContain("fathers: <FathersDeck passages={passages} fathers={fathers} opening={epigraphIndex(passages, body.epigraph)} />");
    // The open door lights white, as a choice that is on does.
    expect(doors).toMatch(/const DOOR_ON = "reader-lit /);
  });

  it("deals the passages as picture cards with Read where it's from and Share, and keeps Gather", () => {
    expect(deck).toContain('t("today.saintWords.readSource")');
    expect(deck).toContain('t("common.share")');
    expect(deck).toContain("<PictureSheet");
    expect(deck).toContain("lead={lead}");
    expect(deck).toContain("<AddToFlorilegium");
    // Signed as the shared picture is.
    expect(deck).toContain("{FOOT.text}");
    // The medallions: All first, then each Father with his count.
    expect(deck).toMatch(/<Medallion on=\{chosen === null\} label=\{t\("common\.all"\)\}/);
  });

  it("shares only a portrait whose rights are recorded, never a carried icon", () => {
    expect(deck).toMatch(/SAINT_FACES\[slug\][\s\S]*?portraitLook\(streamedUrl\(coverFile\(slug\), native\)/);
    expect(deck).not.toMatch(/portraitLook\([^)]*iconUrl/);
  });

  it("gives each card one height, folds a long passage, and centres a short one (build 83)", () => {
    // Every card was as tall as the deck's longest passage, so a short one
    // stood over a gap of several hundred pixels (St Irenaeus's, on The
    // Essence and the Energies). The cards still share one height, which
    // keeps the deck still as it is swiped; a passage folds after
    // CARD_LINES lines in the fold every fold in Purify has, and a shorter
    // one sits in the middle of its card.
    expect(deck).not.toContain("cardTextSize");
    expect(deck).toMatch(/data-card-words=""\s*className="post-fold /);
    expect(deck).toContain('"--fold-lines": CARD_LINES');
    expect(deck).toContain('"--fold-lead": CARD_TEXT.lineHeight');
    expect(deck).toContain('className="flex flex-1 flex-col justify-center px-[22px] pt-2 text-center"');
    // The fade only where words run past the fold.
    expect(deck).toMatch(/toggleAttribute\("data-cut", words\.scrollHeight > words\.clientHeight \+ 1\)/);
    expect(css).toMatch(/\.post-fold\[data-cut\]\s*\{[^}]*mask-image: linear-gradient\(to bottom, #000/);
    // One height for all: the row stretches its cards.
    expect(deck).toMatch(/className="no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory items-stretch /);
  });

  it("dims the cards out of view only while Purify's motion allows it to move", () => {
    expect(css).toMatch(/\.theology-card:not\(\[data-current\]\)\s*\{\s*opacity:\s*0\.5;\s*scale:\s*0\.92;\s*\}/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.theology-card\s*\{\s*transition:\s*none;\s*\}/);
    const card = /\n\.theology-card\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    // The property scale-* would set is named, not `transform`.
    expect(card).toMatch(/transition:[^;]*scale var\(--duration-base\) var\(--ease-house\)/);
  });
});

describe("3, the foot of Theology: C, shelves and a search pill", () => {
  const hub = code(HUB);

  it("is shelves: the line, Begin here as a band, the four ways as tiles, then the councils by year", () => {
    const order = [
      '<T k="study.theology.footHead" />',
      '<T k="study.theology.footLine" />',
      '<T k="study.theology.beginHere" />',
      "data-theology-ways",
      '<T k="study.theology.ecumenicalCouncils" />',
      "<FathersShelf",
      '<T k="study.theology.exploreHistory" />',
      "<TheologySearch />",
    ].map((s) => hub.indexOf(s));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    for (const key of ["doctrine", "topics", "heresies", "apologetics"]) expect(EN[`study.theology.kicker.${key}`], key).toBeTruthy();
  });

  it("drops what the design drops", () => {
    for (const gone of ["study.theology.featured", "study.theology.recentlyAdded", "study.theology.doctrinalCategories", "study.theology.beginWhereChurchBegins", "TheologyFilter"]) {
      expect(hub, gone).not.toContain(gone);
    }
    expect(fs.existsSync(path.join(ROOT, "components/theology/TheologyFilter.tsx"))).toBe(false);
  });

  it("puts the search pill on every Theology screen", () => {
    for (const file of [
      HUB,
      DOCTRINE,
      "components/theology/TheologyShell.tsx",
      "app/(app)/topics/[slug]/page.tsx",
      "app/(app)/heresies/[slug]/page.tsx",
      "app/(app)/apologetics/[slug]/page.tsx",
    ]) {
      expect(code(file), file).toContain("<TheologySearch />");
    }
    // The doctrine index and the Topics, Heresies and Apologetics indexes wear the shell.
    for (const file of ["app/(app)/theology/doctrine/page.tsx", "app/(app)/topics/page.tsx", "app/(app)/heresies/page.tsx", "app/(app)/apologetics/page.tsx"]) {
      expect(code(file), file).toContain("<TheologyShell");
    }
  });

  it("floats the pill over the tab bar, the mini player and the readings bar, and keeps the page's foot clear of it", () => {
    const pill = /\.theology-search-pill\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    for (const v of ["--tab-bar-h", "--now-playing-h", "--readings-flow-h", "safe-area-inset-bottom"]) expect(pill, v).toContain(v);
    const search = code(SEARCH);
    expect(search).toContain('<div aria-hidden className="h-20" />');
    // It steps aside while a sheet is open.
    expect(search).toContain("useOverlayOpen()");
    expect(search).toContain('fetch("/theology-search.json")');
  });

  it("is a file in the apps' export, so the search works with no signal", () => {
    const route = code("app/theology-search.json/route.ts");
    expect(route).toContain('export const dynamic = "force-static";');
    expect(route).toContain("buildTheologySearch()");
  });
});

describe("no pill clouds anywhere on Theology", () => {
  it("the related studies are rows", () => {
    const rail = code(RAIL);
    expect(rail).not.toMatch(/flex-wrap/);
    expect(rail).toContain("theology-row ");
  });

  it("the search's kinds are rows, not scope pills", () => {
    const search = code(SEARCH);
    expect(search).not.toMatch(/flex-wrap/);
    expect(search).not.toMatch(/aria-pressed/);
  });
});

describe("the theology library's search", () => {
  const items: TheologySearchItem[] = [
    { slug: "filioque", title: "The Annihilation of the Filioque", href: "/theology/filioque", section: "Doctrine", summary: "The Spirit proceeds from the Father." },
    { slug: "arianism", title: "Arianism", href: "/heresies/arianism", section: "Heresies", summary: "That the Son was created." },
    { slug: "first-nicaea", title: "First Council of Nicaea", href: "/councils/first-nicaea", section: "Councils" },
  ];

  it("finds by the title and by the line under it, in the library's order", () => {
    expect(searchLibrary(items, "filioque", null).map((i) => i.slug)).toEqual(["filioque"]);
    expect(searchLibrary(items, "SON", null).map((i) => i.slug)).toEqual(["arianism"]);
    expect(searchLibrary(items, "the", null).map((i) => i.slug)).toEqual(["filioque", "arianism"]);
  });

  it("lists a whole kind when one is chosen, and nothing before a word or a kind", () => {
    expect(searchLibrary(items, "", "Councils").map((i) => i.slug)).toEqual(["first-nicaea"]);
    expect(searchLibrary(items, "", null)).toEqual([]);
    expect(searchLibrary(items, "nicaea", "Heresies")).toEqual([]);
  });

  it("names its kinds in the hub's order, each in the reader's language", () => {
    expect(THEOLOGY_SECTIONS).toEqual(["Doctrine", "Topics", "Heresies", "Apologetics", "Councils", "Fathers"]);
    const search = code(SEARCH);
    for (const key of ["study.doctrine", "discover.tile.topics", "discover.tile.heresies", "discover.tile.apologetics", "nav.councils", "bible.fathersTag"]) {
      expect(search).toContain(`"${key}"`);
      expect(EN[key], key).toBeTruthy();
    }
    expect(EN["study.theology.noMatch"]).toContain("{query}");
  });
});

describe("round 3's own files", () => {
  it("carry no em dash", () => {
    for (const file of [FAITH_MAP, HUB, DOCTRINE, READER, DOORS, DECK, SEARCH, SHELF, RAIL, "lib/theology/page.ts", "lib/theology/searchIndex.ts", "lib/theology/searchKinds.ts"]) {
      expect(read(file).includes(String.fromCharCode(0x2014)), file).toBe(false);
    }
  });

  it("keep every motion behind Purify's motion switch, and Read the study clear of the slim row", () => {
    expect(css).toContain("scroll-margin-top: calc(3rem + 70px + var(--inset-top));");
    for (const rule of [".theology-row", ".theology-card", ".theology-face"]) {
      expect(css, rule).toContain(`:where([data-motion="reduce"]) ${rule} {`);
    }
  });
});
