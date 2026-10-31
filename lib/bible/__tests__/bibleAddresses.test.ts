// Every address under /bible keeps working (1.8, the owner's pick A of r3-20,
// "Straight into the book"). The Bible tab opens the chapter itself now, and
// /bible stays: the whole list, the chapter's way back, the website's page,
// and every link anyone ever shared or the app ever wrote, a deep link to a
// book or a verse, the read-aloud, the plans, the day's readings, the
// widgets, the icon's shortcut, the translations.
//
// What a reader would notice if this broke: a shared link to a verse that
// opens a missing page, a plan's day or the read-aloud's Read that opens the
// wrong chapter, or the Bible tab opening one that is not there.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { READING_PLANS } from "@/lib/plans/plans";
import { hrefOfReading } from "@/lib/plans/session";
import { readHref, shareHref } from "@/lib/player/steps";
import { hrefOf, rangesOf } from "@/lib/readings/flow";
import { shortcutTarget } from "@/lib/shortcuts/shortcuts";
import { widgetTarget, widgetUrl } from "@/lib/widget/open";

import { allChapterParams } from "../books";
import { FIRST_PLACE_HREF, bibleTabHref, verseOfHash } from "../lastRead";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");

const CHAPTERS = new Set(allChapterParams().map((p) => `${p.book}/${p.chapter}`));

/** Where an address lands: the page it opens (a missing one is "404"), and the verse it lands on. */
function lands(address: string): { page: "list" | "multi" | "chapter" | "404"; verse: number | null } {
  const [pathAndQuery, hash] = address.split("#");
  const path = pathAndQuery.split("?")[0].replace(/\/+$/, "");
  if (path === "/bible") return { page: "list", verse: null };
  if (path === "/bible/multi") return { page: "multi", verse: null };
  const m = /^\/bible\/([a-z0-9-]+)\/(\d+)$/.exec(path);
  if (!m || !CHAPTERS.has(`${m[1]}/${m[2]}`)) return { page: "404", verse: null };
  return { page: "chapter", verse: hash === undefined ? null : verseOfHash(`#${hash}`) };
}

describe("the pages under /bible", () => {
  it("are all still there: the list, every chapter, and several references at once", () => {
    for (const page of ["app/(app)/bible/page.tsx", "app/(app)/bible/[book]/[chapter]/page.tsx", "app/(app)/bible/multi/page.tsx"]) {
      expect(existsSync(join(root, page)), page).toBe(true);
    }
    const chapter = read("app/(app)/bible/[book]/[chapter]/page.tsx");
    // Every chapter of every book, written out for the apps.
    expect(chapter).toMatch(/export function generateStaticParams\(\) \{\s*return allChapterParams\(\);/);
    expect(chapter).toContain("export const dynamicParams = false;");
    expect(CHAPTERS.size).toBeGreaterThan(1300);
    // The way back from a chapter is still the whole list.
    expect(chapter).toContain('back="/bible"');
  });

  it("keep /bible the whole list, on a phone and on the website", () => {
    const list = read("app/(app)/bible/page.tsx");
    expect(list).toContain("<BibleMobile />");
    expect(list).toContain("label={<T k=\"bible.theOldTestament\" />}");
    expect(list).toContain("label={<T k=\"bible.theNewTestament\" />}");
    expect(read("components/mobile/BibleMobile.tsx")).toContain("<BibleBooks />");
  });

  it("land a link on its chapter and its verse, a range on its first verse", () => {
    expect(lands("/bible")).toEqual({ page: "list", verse: null });
    expect(lands("/bible/")).toEqual({ page: "list", verse: null });
    expect(lands("/bible/john/3")).toEqual({ page: "chapter", verse: null });
    expect(lands("/bible/john/3/")).toEqual({ page: "chapter", verse: null });
    expect(lands("/bible/john/3#v16")).toEqual({ page: "chapter", verse: 16 });
    expect(lands("/bible/james/2#v14-26")).toEqual({ page: "chapter", verse: 14 });
    expect(lands("/bible/psalms/151")).toEqual({ page: "chapter", verse: null });
    expect(lands("/bible/multi")).toEqual({ page: "multi", verse: null });
    expect(lands("/bible/john/22")).toEqual({ page: "404", verse: null });
    // The landing itself reads the same two forms.
    expect(read("components/bible/VerseFocusFlash.tsx")).toContain("const m = hash.match(/^#v(\\d+)(?:-(\\d+))?$/);");
  });

  it("keep a translation's address: the website reads ?v=, the apps put the choice back", () => {
    expect(lands("/bible/john/3?v=nkjv")).toEqual({ page: "chapter", verse: null });
    const chapter = read("app/(app)/bible/[book]/[chapter]/page.tsx");
    expect(chapter).toContain("const { v } = (IS_STATIC_EXPORT ? {} : await searchParams) as { v?: string };");
    expect(read("components/bible/ChapterScreen.tsx")).toContain("<RestoreTranslation testament={book.testament} />");
  });
});

describe("the addresses the app writes", () => {
  it("open a chapter there is: the Bible tab's, first visit and return", () => {
    expect(lands(FIRST_PLACE_HREF)).toEqual({ page: "chapter", verse: null });
    expect(lands(bibleTabHref({ book: "john", chapter: 3, verse: 14 }))).toEqual({ page: "chapter", verse: 14 });
  });

  it("open each plan's every chapter", () => {
    let days = 0;
    for (const plan of READING_PLANS) {
      for (const day of plan.days) {
        for (const reading of day) {
          days += 1;
          expect(lands(hrefOfReading(reading)).page, `${plan.id} ${reading.book} ${reading.chapter}`).toBe("chapter");
        }
      }
    }
    expect(days).toBeGreaterThan(100);
  });

  it("open the read-aloud's chapter at the verse being read, and its share", () => {
    expect(lands(readHref({ kind: "chapter", book: "colossians", chapter: 4 }, 7) ?? "")).toEqual({ page: "chapter", verse: 7 });
    expect(lands(readHref({ kind: "chapter", book: "colossians", chapter: 4 }) ?? "")).toEqual({ page: "chapter", verse: null });
    expect(lands(shareHref({ kind: "chapter", book: "john", chapter: 1 }) ?? "").page).toBe("chapter");
  });

  it("open the day's readings at their verses", () => {
    const item = { book: "luke", chapter: 8, ranges: rangesOf("Luke 8:16-21", 16, 21), label: "Luke 8:16-21", kind: "gospel" as const };
    expect(lands(hrefOf(item))).toEqual({ page: "chapter", verse: 16 });
  });

  it("open the icon's Continue reading and a widget's verse", () => {
    expect(lands(shortcutTarget("continue-reading", { book: "john", chapter: 3, verse: 16 }))).toEqual({ page: "chapter", verse: 16 });
    expect(lands(shortcutTarget("continue-reading", null))).toEqual({ page: "list", verse: null });
    expect(lands(widgetTarget(widgetUrl("verse/luke/8/25")) ?? "")).toEqual({ page: "chapter", verse: 25 });
  });

  it("build the Continue reading row the same way as the tab", () => {
    const row = read("components/mobile/BibleMobileContinue.tsx");
    expect(row).toContain("? `/bible/${last.book}/${last.chapter}#v${resumeVerse}`");
  });
});
