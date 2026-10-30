// A long message in the Community, folded (1.8, the owner's note 19 of build
// 80): folded, a long message ran its paragraphs and lists together into one
// block, which undid the way the writer laid it out. The fold was a line
// clamp, and to keep its ellipsis off the blank line between two paragraphs
// every line break was turned into a space. Now the writer's own lines stay
// and the fold ends in a soft fade.
//
// What a reader would notice if this broke: a folded message as one block
// again, an ellipsis back at the fold's foot (alone on a blank line, the old
// reason), or a fade over the last line of a message that fits its fold.
//
// This reads the source; vitest runs in node with no DOM (vitest.config.ts).

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old fold is not read as the fold. */
const code = (p: string) =>
  read(p)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const client = code("components/community/CommunityClient.tsx");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
/** The body of the one rule whose selector is exactly `selector`. */
const rule = (selector: string) => {
  const at = css.search(new RegExp(`(^|\\})\\s*${selector.replace(/[.[\]()]/g, "\\$&")}\\s*\\{`, "m"));
  expect(at, selector).toBeGreaterThan(-1);
  const open = css.indexOf("{", at);
  return css.slice(open + 1, css.indexOf("}", open));
};

describe("a long message, folded", () => {
  it("keeps the writer's own lines and paragraphs", () => {
    // The body is handed over as written, folded or not, and set so its line
    // breaks and blank lines show. From 1.8 (r3-02 B) at 15px on 22px lines,
    // set like a page.
    expect(client).toContain("<MentionText text={post.body} />");
    expect(client).not.toMatch(/post\.body\.replace\(/);
    expect(client).toMatch(/"mt-2 whitespace-pre-wrap break-words font-sans text-\[15px\] leading-\[22px\] text-paper\/85"/);
    // A shared line keeps its own lines too, in its card.
    expect(client).toMatch(/"whitespace-pre-line font-serif text-\[17px\] font-medium leading-\[1\.5\] text-paper"/);
  });

  it("folds the body and a long quotation by a number of lines, never by a line clamp", () => {
    expect(client).toMatch(/longBody && folded && "post-fold"/);
    expect(client).toMatch(/longQuote && folded && "post-fold"/);
    // An announcement folds sooner, as before: four lines, and six for the rest.
    expect(client).toContain("foldLines(pinned ? 4 : 6, BODY_LEAD)");
    expect(client).toContain("foldLines(6, 1.5)");
    // The ems each fold counts in are the text's own leading: 22px lines on
    // 15px words, and the quotation's 1.5.
    expect(client).toContain("const BODY_LEAD = 22 / 15;");
    expect(client).toMatch(/leading-\[22px\] text-paper\/85",\s*longBody && folded && "post-fold"/);
    expect(client).toMatch(/leading-\[1\.5\] text-paper",\s*longQuote && folded && "post-fold"/);
    expect(client).not.toMatch(/folded && \(?[^)]*"line-clamp-/);
  });

  it("ends in Read more with a chevron that turns, only with motion on", () => {
    expect(client).toMatch(/\{unfolded \? t\("community\.showLess"\) : t\("community\.readMore"\)\}\s*<ChevronDown size=\{15\} className=\{cn\("motion-safe:transition-transform", unfolded && "rotate-180"\)\} \/>/);
  });

  it("ends the fold in a soft fade, only where the words run past it", () => {
    const fold = rule(".post-fold");
    expect(fold).toMatch(/overflow: hidden;/);
    expect(fold).toMatch(/max-height: calc\(var\(--fold-lines\) \* var\(--fold-lead\) \* 1em\);/);
    expect(css).toMatch(/@supports \(height: 1lh\) \{\s*\.post-fold \{\s*max-height: calc\(var\(--fold-lines\) \* 1lh\);/);
    // No ellipsis anywhere in it: no clamp, no text-overflow.
    expect(fold).not.toMatch(/line-clamp|text-overflow|-webkit-box/);
    const cut = rule(".post-fold[data-cut]");
    expect(cut).toMatch(/-webkit-mask-image: linear-gradient\(to bottom, #000 calc\(100% - var\(--fold-lead\) \* 1\.5em\), transparent\);/);
    expect(cut).toMatch(/(^|\s)mask-image: linear-gradient\(to bottom, #000 calc\(100% - var\(--fold-lead\) \* 1\.5em\), transparent\);/);
    // The cut is measured on the element itself, both folds of a card.
    expect(client).toMatch(/el\.toggleAttribute\("data-cut", el\.scrollHeight > el\.clientHeight \+ 1\)/);
    expect(client).toContain("const bodyFold = useFoldCut<HTMLParagraphElement>(longBody && folded);");
    expect(client).toContain("const quoteFold = useFoldCut<HTMLParagraphElement>(longQuote && folded);");
    expect(client).toMatch(/<p\s+ref=\{bodyFold\}/);
    expect(client).toMatch(/<p\s+ref=\{quoteFold\}/);
  });
});
