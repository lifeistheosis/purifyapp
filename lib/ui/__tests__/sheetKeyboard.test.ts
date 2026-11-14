// Build 97 note 2, the owner: "and it's a jump and a flash for the typing bug". A field in a sheet's
// body, tapped: the keyboard comes, the sheet moves the page only as far as the line being written
// needs, and the WebView's own scroll of the field's whole box into view is put back
// (lib/ui/sheetKeyboard.ts). The numbers are the walk's, at 390 by 844 with a keyboard of 300px, on
// a journal page with a cover (scripts/keyboard-sheet-walk.mjs).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { keptScroll } from "@/lib/ui/sheetKeyboard";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("a field in a sheet while the keyboard comes", () => {
  // The page's last field stood at 476 to 729 with the body at 0; the cursor on its first line (31px
  // of words); the keyboard left the body's foot at 470.8. The WebView then scrolled the body to 259.
  const afterWebView = { fieldTop: 217.3, fieldBottom: 470.3, wordsHeight: 31, scrollerBottom: 470.8 };

  it("moves the page only as far as the line being written needs, not as the WebView did", () => {
    // The line ends at 507 with the body at 0: 60px up brings it 24px above the foot.
    expect(keptScroll(0, 259, afterWebView)).toBe(61);
  });

  it("leaves a line already in view where it is", () => {
    // No cover: the field at 247 to 500, the line at 278, in view; the WebView had scrolled 30px.
    expect(keptScroll(0, 30, { fieldTop: 217.4, fieldBottom: 470.4, wordsHeight: 31, scrollerBottom: 470.8 })).toBe(0);
  });

  it("keeps where the reader had scrolled the page to, not the top", () => {
    expect(keptScroll(120, 320, { fieldTop: 150, fieldBottom: 403, wordsHeight: 31, scrollerBottom: 470.8 })).toBe(120);
  });

  it("is the sheet's, so every sheet with a field in its body has it, and the journal keeps no second copy", () => {
    const hook = read("lib/ui/useDraggableSheet.ts");
    expect(hook).toMatch(/holdFieldOnKeyboard\(body\)/);
    const composer = read("components/journal/JournalComposer.tsx");
    expect(composer).not.toMatch(/visualViewport|scrollForWritingLine\(/);
  });
});
