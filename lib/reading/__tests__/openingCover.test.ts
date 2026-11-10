// A book opens on its cover (1.9). The owner's yes of 2026-11-10 ("all
// recs") to a cover at the head of a reading room book, so that the cover a
// reader taps in the room travels into the page it opens, as every card's
// picture does since build 89 note 4 (lib/ui/routeMotion.ts).
//
// What it holds:
//   where it stands   over the head of the chapter the book was opened on,
//                     whichever that is, and on no other chapter
//   when it is there  with the page, outside the reader: in the apps the
//                     text comes after the page, and a cover drawn with the
//                     text would not be standing when the tile's picture
//                     needs somewhere to go
//   what it is        the room's own poster, by the same title (which is how
//                     the travelling picture finds it), the same picture and
//                     the same window onto a council's icon
//   how large         by the screen's height, never narrower than the plate
//                     its words are fitted to
//   a return          goes on to the reader's paragraph once the page has
//                     arrived, not while the cover is still travelling
//
// What a reader would notice if this broke: the cover they tapped vanishing
// with the reading room again; a cover over every chapter as they read on; a
// cover that jumps in when the text lands; or a page that scrolls away under
// the cover while it is still on its way.
//
// What it does not hold: the travel itself, which no test here can see. That
// is scripts/route-motion.mjs, on the export (three walks: a book, a book
// left in the middle, a council's document).

import fs from "node:fs";
import path from "node:path";

import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { OpeningCover } from "@/components/reading/OpeningCover";
import { chapterNamed, chapterOf } from "@/components/saints/useWorkPlace";
import { COUNCILS } from "@/lib/councils/councils";
import { getMessages } from "@/lib/i18n";
import { SIZES } from "@/lib/reading/coverText";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes (a note in the page's own markup leaves its two braces behind). */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
/** The words a reader sees, tags gone, and the spaces that hold a name on one line made plain. */
const words = (out: string) => out.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const WORK = "app/(app)/saints/[slug]/[work]/page.tsx";
const DOCUMENT = "app/(app)/councils/[slug]/[document]/page.tsx";
const COVER = "components/reading/OpeningCover.tsx";
const PLACE = "components/saints/useWorkPlace.ts";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
function render(node: ReactElement): string {
  return renderToString(createElement(MessagesProvider, { locale: "en", messages: getMessages("en") } as ProviderProps, node));
}

describe("the chapter a book was opened on", () => {
  it("is named by what the page was asked for, before any text is read", () => {
    // Its beginning: the book's first chapter, whatever its number.
    expect(chapterNamed("first", 1)).toBe("1");
    expect(chapterNamed("first", 7)).toBe("7");
    // The place the reader left, a chapter a row names, a paragraph a citation opens.
    expect(chapterNamed("kept:102:7", 1)).toBe("102");
    expect(chapterNamed("#s105", 1)).toBe("105");
    expect(chapterNamed("#p-103-4", 1)).toBe("103");
  });

  it("is the same chapter by every way to it, so the cover is there again when the reader is", () => {
    // Opened at its beginning, turned on, and turned back by the pill (#s1).
    expect(chapterNamed("#s1", 1)).toBe(chapterNamed("first", 1));
    // Opened from Continue (#s102), and found again where it was kept.
    expect(chapterNamed("kept:102:0", 1)).toBe(chapterNamed("#s102", 1));
    expect(chapterNamed("#p-102-9", 1)).toBe(chapterNamed("#s102", 1));
    // And another chapter is another.
    expect(chapterNamed("#s103", 1)).not.toBe(chapterNamed("#s102", 1));
  });

  it("agrees with the chapter the reader draws, for every place a text can turn into a chapter without being read", () => {
    const sections = [{ n: 1 }, { n: 102 }, { n: 103 }];
    for (const target of ["first", "kept:102:7", "kept:103:0", "#s1", "#s103", "#p-102-4"]) {
      expect(chapterNamed(target, 1), target).toBe(String(chapterOf(target, sections).n));
    }
  });

  it("a place by the edition's numbers is known only by its own address until the text is read", () => {
    expect(chapterNamed("#at-1.2.3", 1)).toBe("#at-1.2.3");
    expect(chapterNamed("#at-1.2.3", 1)).not.toBe(chapterNamed("#at-1.2.4", 1));
  });

  it("is remembered from the first asking, never from the text, and forgotten when the book is left", () => {
    const place = code(PLACE);
    const hook = place.slice(place.indexOf("export function useOnOpening"), place.indexOf("export function chapterOf"));
    // The address and the kept place: the same store the reader turns its chapters by.
    expect(hook).toContain("useSyncExternalStore(");
    expect(hook).toContain("subscribeHash,");
    expect(hook).toContain("() => onOpeningNow(owner, slug, first),");
    // On the server, and while the page wakes, it is the opening: the cover is in the page as written.
    expect(hook).toContain("() => true,");
    expect(place).toContain("if (!openedOn.has(key)) openedOn.set(key, chapter);");
    expect(place).toContain("return openedOn.get(key) === chapter;");
    // Left before the text came, the place it opened on is not left behind for the next visit.
    expect(hook).toMatch(/openedOn\.delete\(key\);\s*lastAddress\.delete\(key\);\s*opening\.delete\(key\);/);
  });
});

describe("the cover at a book's head", () => {
  const card = { key: "augustine-of-hippo/confessions", title: "Confessions", author: "St. Augustine of Hippo", cover: { src: "/covers/augustine-of-hippo.jpg", focusY: 20 } };

  it("is the room's poster, found by the title its tile wears", () => {
    const out = render(createElement(OpeningCover, { owner: "augustine-of-hippo", slug: "confessions", first: 1, card }));
    expect(out).toContain('data-opening-cover=""');
    // What a travelling picture looks for (lib/ui/routeMotion.ts, takerOf).
    expect(out).toContain('data-carry-into="cover:Confessions"');
    expect(words(out)).toContain("Confessions");
    expect(words(out)).toContain("St. Augustine of Hippo");
    expect(out).toContain("/covers/augustine-of-hippo");
    // Hidden from assistive technology, as every cover is.
    expect(out).toMatch(/<div aria-hidden="true" data-cover=""/);
  });

  it("names a book no one signed as the room does", () => {
    const out = render(createElement(OpeningCover, { owner: "polycarp-of-smyrna", slug: "martyrdom", first: 1, card: { ...card, author: null } }));
    expect(words(out)).toContain(getMessages("en")["reading.work.anonymous"] as string);
  });

  it("draws what the tile draws: the same picture, the covers pack over it, a council's window", () => {
    const cover = code(COVER);
    expect(cover).toContain("const card = packedCard(built, useCoversVersion());");
    expect(cover).toContain('author={card.author ?? t("reading.work.anonymous")}');
    expect(cover).toContain("iconUrl={card.cover?.src}");
    expect(cover).toContain("focusY={card.cover?.focusY}");
    expect(cover).toContain("crop={card.cover?.crop}");
    // The row's own design, larger: its words break and fit as the tile's do. And the one cover the screen opens on.
    expect(cover).toContain('size="row"');
    expect(read("components/reading/CoverRow.tsx")).toMatch(/<WorkCover\b[^>]*\bsize="row"/);
    expect(cover).toMatch(/\bpriority\b/);
    // Never held back unseen: it has to be standing when the page changes.
    expect(cover).not.toMatch(/\bhold=/);
  });

  it("is sized by the screen's height, and never narrower than the plate its words are fitted to", () => {
    const widths = [...code(COVER).matchAll(/(md:)?w-\[clamp\((\d+)px,calc\((\d+)vh_-_(\d+)px\),(\d+)px\)\]/g)];
    // On a phone and on a computer alike: the row's tile has a width of its own at each.
    expect(widths.map((w) => w[1] ?? "")).toEqual(["", "md:"]);
    expect(new Set(widths.map((w) => w.slice(2).join())).size).toBe(1);
    const [least, share, less, most] = widths[0].slice(2).map(Number);
    const wide = (screen: number) => Math.min(most, Math.max(least, (screen * share) / 100 - less));
    // The row's own tile at the least, which is the plate its words are fitted to.
    expect(least).toBe(SIZES.row.min);
    // As a walk's page holds its cover, on a phone 844px tall and up.
    expect(most).toBe(SIZES.lg.min);
    expect(wide(844)).toBe(most);
    expect(wide(932)).toBe(most);
    // And the row's own on a short phone, where every pixel of height is the first lines' room.
    expect(wide(667)).toBe(least);
    expect(wide(640)).toBe(least);
    // In between it grows with the screen, never jumping.
    expect(wide(760)).toBeGreaterThan(least);
    expect(wide(760)).toBeLessThan(most);
  });

  it("stands only on the chapter the book was opened on", () => {
    const cover = code(COVER);
    expect(cover).toContain("const here = useOnOpening(owner, slug, first);");
    expect(cover).toContain("if (!here) return null;");
  });
});

describe("a book's page", () => {
  it("writes the cover with the page, above the reader and outside it, in the apps and on the website", () => {
    const page = code(WORK);
    const at = page.indexOf("<OpeningCover");
    expect(at).toBeGreaterThan(0);
    // Above both readers: the one whose text is in the page, and the one whose text comes after it.
    expect(at).toBeLessThan(page.indexOf("<LazyWritingReader"));
    expect(at).toBeLessThan(page.indexOf("<WritingReader"));
    // First on the page, in the same place in every language: over the line that says a work is not yet translated.
    expect(at).toBeLessThan(page.indexOf("<ContentNotYetTranslated"));
    // Not inside the choice between them: one element, the same when the text lands.
    expect(page.slice(at, page.indexOf("{IS_STATIC_EXPORT ? ("))).toContain(") : null}");
    expect(page).toContain("owner={found.saint.slug}");
    expect(page).toContain("slug={content.slug}");
    // The first chapter's number from the text itself, as the reader reads it (chapterOf).
    expect(page).toContain("first={content.sections[0]?.n ?? 1}");
    expect(page).toContain("card={{ key: book.header.card.key, title: book.header.card.title, author: book.header.card.author, cover: book.header.card.cover }}");
    // The readers do not draw it themselves.
    for (const reader of ["components/saints/WritingReader.tsx", "components/saints/LazyWritingReader.tsx", "components/councils/CouncilReader.tsx"]) {
      expect(code(reader), reader).not.toContain("OpeningCover");
    }
  });

  it("keys the cover's place as the reader keys its chapters", () => {
    // The reader: useChapterTarget(saint.slug, content.slug), and a council's under "councils/<council>".
    expect(code("components/saints/WritingReader.tsx")).toContain("const target = useChapterTarget(saint.slug, content.slug);");
    expect(code("components/councils/CouncilReader.tsx")).toContain("const target = useChapterTarget(positionKey, docSlug);");
    const page = code(DOCUMENT);
    expect(page).toContain("const positionKey = `councils/${c.slug}`;");
    expect(page).toMatch(/<OpeningCover\s+owner=\{positionKey\}\s+slug=\{docRef\.slug\}\s+first=\{about\.first\}/);
    expect(page.indexOf("<OpeningCover")).toBeLessThan(page.indexOf("<CouncilReader"));
    expect(page.indexOf("<OpeningCover")).toBeLessThan(page.indexOf("<ContentNotYetTranslated"));
  });

  it("a council's document wears the card its shelf's cover wears", () => {
    const page = code(DOCUMENT);
    expect(page).toContain("card={{ key: `councils/${c.slug}/${docRef.slug}`, title: docRef.title, author: about.author, cover: about.cover }}");
    const books = code("lib/councils/books.ts");
    expect(books).toContain("key: `councils/${c.slug}/${doc.slug}`,");
    expect(books).toContain("title: doc.title,");
    expect(books).toContain("author: authorLine(c),");
    expect(books).toContain("cover: { src: picture.src, focusY: 30, crop: cropOf(c.slug, doc.slug) }");
    expect(page).toContain("author: authorLine(c),");
    expect(page).toContain("cover: picture ? { src: picture.src, focusY: 30, crop: cropOf(c.slug, docRef.slug) } : undefined,");
  });

  it("and every document's shelf title is the title its own page prints, so the head and About this book agree", () => {
    let seen = 0;
    for (const c of COUNCILS) {
      for (const d of c.documents) {
        if (d.href) continue;
        seen++;
        const file = JSON.parse(read(`data/councils/${c.slug}/${d.slug}.json`)) as { title: string };
        expect(file.title, `${c.slug}/${d.slug}`).toBe(d.title);
      }
    }
    expect(seen).toBeGreaterThan(30);
  });
});

describe("a book the reader left in the middle", () => {
  it("goes on to their paragraph once the page has arrived", () => {
    const place = code(PLACE);
    const landing = place.slice(place.indexOf("export function useLanding"), place.indexOf("export function useKeepPlace"));
    expect(landing).toContain("const settle = place.paragraph > 0 ? untilSettled() : 0;");
    expect(landing).toMatch(/if \(settle > 0\) wait = setTimeout\(land, settle\);\s*else land\(\);/);
    // And the wait is let go with the page.
    expect(landing).toContain("if (wait) clearTimeout(wait);");
    // A reader who has started on their own in the meantime is still left where they are.
    expect(landing.indexOf("if (!byAddress && inputSince(opened)) return;")).toBeGreaterThan(landing.indexOf("const land = () => {"));
  });
});
