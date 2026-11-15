// Gate 3c's three in-page changes that moved content at once (Updates 85),
// each moved now in the house's way (lib/ui/inPageMove.ts; the owner's ruling
// of 2026-11-13: a change that moves content moves as a page switch does,
// and under reduced motion happens at once, which movePage does itself).
//
// What a reader would notice if this broke: Community's "Ask a Priest" would
// cut to its waiting rows and its questions land in one frame; a kept
// starter's passage would step down in one frame; Settings' Councils sheet
// would rise short and then leap up by its whole list.
//
// It cannot watch a transition (vitest runs with no browser). The check that
// does is the gate's motion walk (scripts/motion-walk.mjs) on the export.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("Gate 3c's in-page cuts and jumps, each moved (Updates 85)", () => {
  it("Community's words are tabs: a tap or an arrow cross-fades the feed; the sliders' filters change at once", () => {
    const tabs = read("components/community/FeedTabs.tsx");
    expect(tabs).toContain("const choose = (next: FeedFilter) => movePage(() => onFilter(next));");
    expect(tabs).toContain("onClick={() => choose(id)}");
    expect(tabs).toMatch(/e\.preventDefault\(\);\s*choose\(tabs\[next\]\);/);
    // No word changes the feed outside a move; only the sliders' choice calls onFilter itself.
    expect(tabs.match(/onFilter\(/g)).toHaveLength(2);
    expect(tabs).toContain("onSelect: () => onFilter(id === filter ? tabs[0] : id),");
  });

  it("Ask a Priest's questions move in over its waiting rows, after the tab's move; a list that changes nothing is let be", () => {
    const c = read("components/community/CommunityClient.tsx");
    const effect = c.slice(c.indexOf("// Ask a Priest: the latest questions"), c.indexOf("// How much waits for the moderators"));
    expect(effect).toContain('const next = await fetchCommunityPosts(null, { category: "question" });');
    expect(effect).toMatch(/const shown = shownQuestions\.current;\s*if \(settle\(shown\) === shown\) \{\s*setQuestionsFeed\(settle\);\s*return;\s*\}\s*await afterMoves\(\);\s*if \(alive\) movePage\(\(\) => setQuestionsFeed\(settle\)\);/);
    // Nothing sets the list outside those two lines.
    expect(effect.match(/setQuestionsFeed\(/g)).toHaveLength(2);
    expect(c).toMatch(/useEffect\(\(\) => \{\s*shownQuestions\.current = questionsFeed;\s*\}, \[questionsFeed\]\);/);
  });

  it("Keep this gathering: the kept row is let down in the button's place and the passage glides", () => {
    const src = read("components/florilegium/StarterPage.tsx");
    const keep = src.slice(src.indexOf("function keep("), src.indexOf("return (", src.indexOf("function keep(")));
    expect(keep).toMatch(
      /movePage\(\s*\(\) => \{\s*try \{\s*const id = create\(t\(s\.nameKey\), starterReference\(s, bookName\(s\.book\)\)\);\s*for \(const item of starterItems\(s, bookName\(s\.book\)\)\) addItem\(id, item\);\s*\} finally \{\s*keeping\.current = false;\s*\}\s*\},\s*\{ grows: \[action\.current\] \},\s*\);/,
    );
    // One tap keeps once: the guard holds until the row stands, not only until the move is asked for.
    expect(keep).not.toContain(".finally(");
    expect(keep).toMatch(/if \(ok === false\) \{\s*keeping\.current = false;\s*upgrade\.open\("florilegium"\);\s*return;\s*\}/);
    expect(src).toContain('<div ref={action} className="mt-6" data-starter-action="" aria-live="polite">');
  });

  it("the Councils sheet opens once its names have come, with its doors in it, and without them if they cannot come", () => {
    const sheet = read("components/reader/EarnSheet.tsx");
    expect(sheet).toContain('const wanted = goal === "councils" && !councils;');
    expect(sheet).toContain("if (!goal || wanted) return null;");
    expect(sheet).toMatch(/\(\) => \{\s*if \(live\) setCouncils\(\[\]\);\s*\},\s*\);/);
    expect(sheet).toContain('<Sheet open onClose={onClose} title={title} desktop bodyClassName="earn-sheet">');
    // Every card that opens it, Settings' row, the reading-mode page and the Bible's sheet, opens this one.
    for (const file of ["components/settings/ReadingModePages.tsx", "components/settings/ReadingModeGallery.tsx", "components/reader/ReadingModeChips.tsx"]) {
      expect(read(file), file).toContain("<EarnSheet goal={goal} locked={locked} onClose={() => setGoal(null)} />");
    }
  });
});
