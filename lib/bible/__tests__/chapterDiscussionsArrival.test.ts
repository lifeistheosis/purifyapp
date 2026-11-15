// Updates 97 (2026-11-15; proved by Updates 95, routed by Arbiter 14): nothing on a page moves after
// it arrives, and a reader with no signal is a real reader (the apps are local-first).
//
// From /history/alaska-mission/, "Matthew 28:19-20" opens /bible/matthew/28/ standing at the chapter's
// end. With no network the chapter's Community feed failed at once, and its failure was drawn as the
// quiet card ("No one has discussed ..."), above the chapter's foot: the page grew 205px and the foot
// (KeepScrolling) moved 83 to 91px in one frame, in 4 of 4 walks with motion on, both readers alike.
// Online the answer came after the glide, below the screen, so the walks saw nothing; but it would
// arrive the same way for a reader already standing at a chapter's foot.
//
// The rule kept here: the section is drawn only from the feed's own answer, and only while its place
// is below the screen, so a reader never sees it come in.
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/** The file's code without its comments, so words in a comment neither pass nor fail these. */
function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

describe("a chapter's Community section moves nothing when it arrives", () => {
  const src = code("components/bible/ChapterDiscussions.tsx");

  it("draws a section only from the feed's own answer: a failed, dark or unreached feed draws none", () => {
    expect(src).toContain('if (alive && res.state === "ok") setLoaded({ ref, posts: res.posts });');
    expect(src).not.toMatch(/res\.state === "ok" \? res\.posts : \[\]/);
    expect(src.match(/\bsetLoaded\(/g)).toHaveLength(1);
  });

  it("is drawn only once its place is below the screen, so nothing the reader can see moves", () => {
    expect(src).toContain("new IntersectionObserver(");
    expect(src).toContain(
      "if (e && !e.isIntersecting && e.boundingClientRect.top >= (e.rootBounds?.bottom ?? window.innerHeight)) setPlaced(ref);",
    );
    expect(src.match(/\bsetPlaced\(/g)).toHaveLength(1);
    expect(src).toContain("if (!loaded || loaded.ref !== ref || placed !== ref) return <div ref={slot} />;");
  });

  it("keeps its place from the first frame with a holder that takes no room", () => {
    // An empty block between the chapter's pager and its foot: no class, no children, so the
    // margins run through it and the page is laid out as though it were not there.
    expect(src).toContain("return <div ref={slot} />;");
    expect(src).not.toMatch(/<div ref=\{slot\} className=/);
  });

  it("keeps the section itself as it was online (preconditions)", () => {
    expect(src).toContain(
      '<section data-reader-chrome aria-labelledby="chapter-discussed" className="mt-10 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">',
    );
    expect(src).toContain('t("bible.discussedNone", { chapter: `${bookName} ${chapter}` })');
    // Nothing is asked of the feed while Community is switched off.
    expect(src).toContain("if (!enabled) return;");
  });
});
