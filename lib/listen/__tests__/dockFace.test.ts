// The face a text wears while it is read aloud (build 98 note 2, the
// arbiter's look at On the Incarnation playing at 390, 2026-11-16):
//  - the dock wore the app's cross plate while the work's page showed St.
//    Athanasius's icon on its cover: every page that has a picture of its
//    own hands it to Listen (a work's cover, a saint's icon, an event's
//    picture, a council's icon, a study's subject), the plate only where
//    there is none;
//  - its title read "On the Incarnation. On the I...": the work's one
//    section is titled by the work's full name, so the name came twice. The
//    title is the text's name once, with its part where it has parts;
//  - its row lost the arrows the work's pill at rest draws (a work's pill
//    draws its two always, dimmed at the ends).
// What a reader would notice if this broke: the cross in place of the icon
// the page shows, the work's name twice under the player, and the arrows
// gone from under the finger when Listen is tapped.
//
// Fails on the code before the mend: listenTitle is new (the import), no
// page passes `art`, and the dock's arrows were drawn only with a step.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { listenTitle } from "@/lib/listen/texts";
import { bookPage } from "@/lib/reading/cards";
import { getSaint } from "@/lib/saints/saints";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const work = (key: string) =>
  JSON.parse(read(`data/saints/${key}.json`)) as { title: string; sections: { n: number; title: string }[] };

describe("a text's name, read aloud", () => {
  it("is a work of one section's name once", () => {
    const w = work("athanasius-the-great/on-the-incarnation");
    expect(w.sections).toHaveLength(1);
    expect(w.sections[0].title).toBe("On the Incarnation of the Word");
    expect(listenTitle(w.title, w.sections[0].title, w.sections.length)).toBe("On the Incarnation");
  });

  it("is the work's name with its part where it has parts", () => {
    const w = work("athanasius-the-great/four-discourses-against-the-arians");
    expect(listenTitle(w.title, w.sections[0].title, w.sections.length)).toBe("Four Discourses Against the Arians. Discourse I");
  });

  it("is a part's own title where it already begins with the work's name", () => {
    expect(listenTitle("On the Holy Spirit", "On the Holy Spirit, Book II", 3)).toBe("On the Holy Spirit, Book II");
    expect(listenTitle("Letters", "Letters", 9)).toBe("Letters");
    expect(listenTitle("Letters", "", 9)).toBe("Letters");
  });

  it("never names a work twice, in any work of the library", () => {
    const root = path.join(process.cwd(), "data/saints");
    let checked = 0;
    for (const saint of fs.readdirSync(root, { withFileTypes: true })) {
      if (!saint.isDirectory()) continue;
      for (const file of fs.readdirSync(path.join(root, saint.name))) {
        if (!file.endsWith(".json")) continue;
        const w = work(`${saint.name}/${file.replace(/\.json$/, "")}`);
        if (!w.title || !Array.isArray(w.sections)) continue;
        for (const s of w.sections) {
          const title = listenTitle(w.title, s.title, w.sections.length);
          expect(title.split(w.title).length - 1, `${saint.name}/${file} §${s.n}: ${title}`).toBeLessThanOrEqual(1);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it("is what the work's and the council's pages hand to Listen", () => {
    expect(read("components/saints/WritingReader.tsx")).toMatch(/title=\{listenTitle\(content\.title, sec\.title, content\.sections\.length\)\}/);
    expect(read("components/councils/CouncilSections.tsx")).toMatch(/title=\{listenTitle\(content\.title, s\.title, content\.sections\.length\)\}/);
  });
});

describe("the text's own picture, read aloud", () => {
  it("is On the Incarnation's cover, St. Athanasius's icon, where its page shows it", () => {
    const saint = getSaint("athanasius-the-great")!;
    expect(bookPage(saint, "on-the-incarnation", true)?.header.card.cover?.src).toBeTruthy();
    expect(read("components/saints/WritingReader.tsx")).toMatch(/art=\{about\?\.header\.card\.cover\?\.src \?\? null\}/);
    expect(read("components/saints/WritingReader.tsx")).toMatch(/by=\{sec\.voiceAuthor \?\? saint\.name\}\s*art=\{art\}/);
  });

  it("is a saint's icon on his life, an event's picture, a council's icon and a study's subject", () => {
    expect(getSaint("athanasius-the-great")?.iconUrl).toMatch(/^\/saints\/icons\//);
    const life = read("components/saints/SaintLife.tsx");
    expect(life).toMatch(/<ListenHere id=\{listenId\("life", saint\.slug\)\}[^>]*art=\{lifeArt\(saint\)\}/);
    expect(life).toMatch(/if \(saint\.iconUrl\) return saint\.iconUrl;\s*const hero = saintHero\(saint\.slug\);/);
    expect(read("components/history/EventArticle.tsx")).toMatch(/<ListenHere id=\{listenId\("history", meta\.slug\)\}[^>]*art=\{eventPicture\(meta, IS_STATIC_EXPORT\)\?\.src \?\? null\}/);
    expect(read("components/councils/CouncilSections.tsx")).toMatch(/councilPicture\(council\.slug, IS_STATIC_EXPORT\)\?\.src/);
    expect(read("components/theology/StudyPartText.tsx")).toMatch(/art=\{study\.art \?\? null\}/);
    expect(read("app/(app)/theology/[topic]/read/page.tsx")).toMatch(/art: subject\?\.picture\.src \?\? null/);
  });

  it("is carried by Listen into the player, where the dock draws it, the plate only for none", () => {
    const here = read("components/reading/ListenHere.tsx");
    expect(here).toMatch(/registerListen\(\{ id, title, by, art \}\)/);
    expect(here).toMatch(/startListening\(id, \{ title: text\.title, by: text\.by, art: text\.art \}\)/);
    expect(read("components/bible/ReaderDock.tsx")).toMatch(/<CoverArt src=\{audio\.art\} fallback=\{audio\.artFallback\} size=\{46\}/);
  });
});

describe("the dock's arrows", () => {
  const dock = read("components/bible/ReaderDock.tsx");

  it("stand as the pill at rest draws them", () => {
    expect(dock).toMatch(/turns = Boolean\(prev \|\| next\)/);
    expect(dock).toMatch(/\{turns \? <DockArrow target=\{prev\}/);
    expect(dock).toMatch(/\{turns \? <DockArrow target=\{next\}/);
    expect(dock).not.toMatch(/\{prev \|\| next \? <DockArrow/);
  });

  it("always on a work, whose pill draws both at rest, dimmed at the ends", () => {
    const pill = read("components/saints/MobileWorkPill.tsx");
    expect(pill).toMatch(/disabled=\{!prev\}/);
    expect(pill).toMatch(/disabled=\{!next\}/);
    expect(pill).toMatch(/<ReaderDock[\s\S]*?\n\s*turns\n\s*\/>/);
  });
});
