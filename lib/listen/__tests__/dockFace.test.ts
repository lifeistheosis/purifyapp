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

  it("is a council's part's own title where it names the document after \"On\", and the name alone where the part is a piece of it", () => {
    const council = (key: string) =>
      JSON.parse(read(`data/councils/${key}.json`)) as { title: string; sections: { n: number; title: string }[] };
    const canons = council("first-nicaea/the-twenty-canons");
    expect(canons.sections[0].title).toBe("On the Twenty Canons");
    // Read "The Twenty Canons. On the Twenty Canons" (Updates 98k's walk).
    expect(listenTitle(canons.title, canons.sections[0].title, canons.sections.length)).toBe("On the Twenty Canons");
    expect(listenTitle(canons.title, canons.sections[1].title, canons.sections.length)).toBe("The Twenty Canons. Canon I");
    const sardica = council("sardica/the-twenty-canons");
    expect(listenTitle(sardica.title, sardica.sections[0].title, sardica.sections.length)).toBe("The Twenty Canons");
    const antioch = council("antioch-341/the-synodal-letter-and-canons");
    expect(listenTitle(antioch.title, antioch.sections[0].title, antioch.sections.length)).toBe("The Synodal Letter and the Twenty-Five Canons");
    const creed = council("first-nicaea/i18n/de/the-symbol-of-the-faith");
    expect(listenTitle(creed.title, creed.sections[0].title, creed.sections.length)).toBe("Über das Glaubensbekenntnis");
  });

  it("never names a work or a council's document twice, in the whole library and its translations", () => {
    // Compared as a reader hears them: in lower case, without a leading "On" and article.
    const bare = (t: string) =>
      t.toLocaleLowerCase().trim().replace(/^(?:on|über)\s+/u, "").replace(/^(?:the|an?|das|die|der|den|dem|des)\s+/u, "");
    const words = (whole: string, piece: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${piece.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u").test(whole);
    const files = (root: string) => {
      const out: string[] = [];
      const walk = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory()) walk(path.join(dir, e.name));
          else if (e.name.endsWith(".json")) out.push(path.join(dir, e.name));
        }
      };
      walk(path.join(process.cwd(), root));
      return out;
    };
    const checked = { works: 0, councils: 0 };
    for (const [kind, root] of [["works", "data/saints"], ["councils", "data/councils"]] as const) {
      for (const file of files(root)) {
        let w: { title?: string; sections?: { n: number; title: string }[] };
        try {
          w = JSON.parse(fs.readFileSync(file, "utf8"));
        } catch {
          continue;
        }
        if (!w || !w.title || !Array.isArray(w.sections)) continue;
        const where = path.relative(process.cwd(), file);
        for (const s of w.sections) {
          const title = listenTitle(w.title, s.title, w.sections.length);
          expect(title.split(w.title).length - 1, `${where} §${s.n}: ${title}`).toBeLessThanOrEqual(1);
          if (title === `${w.title}. ${(s.title ?? "").trim()}`) {
            // Joined, so the part names neither the work again nor a piece of its name.
            expect(words(bare(s.title), bare(w.title)) && bare(s.title).startsWith(bare(w.title)), `${where} §${s.n}: ${title}`).toBe(false);
            expect(words(bare(w.title), bare(s.title)), `${where} §${s.n}: ${title}`).toBe(false);
          }
          checked[kind]++;
        }
      }
    }
    expect(checked.works).toBeGreaterThan(1000);
    expect(checked.councils).toBeGreaterThan(300);
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
