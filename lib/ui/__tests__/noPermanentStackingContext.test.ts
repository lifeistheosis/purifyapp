// A source-reading guard, in the idiom of lib/calendar/__tests__/noFrozenDay.test.ts.
//
// `animation-fill-mode: both` keeps an animation in effect after it finishes.
// For the opacity fades this app runs on entrance, that leaves the animated
// element a PERMANENT stacking context, so every z-index inside it is scoped
// to that element and can never rise above a later sibling. Two siblings at
// `z-index: auto` then paint in DOM order whatever their children ask for.
//
// This has now bitten three times:
//   1. The tab bar painting over the commentary sheet's z-[60] (5ee95ed3).
//   2. BibleSearchOverlay trapped inside `.route-fade`.
//   3. 2026-08-09, reported by a reader on Android: the saints search dropdown
//      (z-50) rendered underneath the saint icons of the browser block that
//      follows it on /saints, so the list of names sat behind an icon of the
//      Theotokos.
//
// `backwards` fills only during the delay and hands the element back to its
// own style when the animation ends. For a 0 -> 1 opacity fade that is
// visually identical, and the stacking context lasts one animation rather
// than the life of the page.
//
// The guard is deliberately narrow. It covers only the two STRUCTURAL
// wrappers, `.cascade > *` and `.route-fade`, because those wrap arbitrary
// page content and so trap whatever a page happens to put inside them. Other
// rules in globals.css do use `both` (the `.gift-*` sequence). Those are
// opt-in classes on specific leaf elements, so they are correct as they are
// and are not scanned. (History's marker entrance and its scroll-driven
// account reveals, which also filled `both`, went with the 1.7 timeline.)
// Ban `both` on a wrapper, not on a leaf.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS_PATH = join(process.cwd(), "app", "globals.css");

/** Strip comments so the prose explaining the rule is not itself scanned. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** The body of the first rule whose selector matches, comments removed. */
function ruleBody(css: string, selector: string): string {
  const at = css.indexOf(selector + " {");
  if (at === -1) throw new Error(`rule not found in globals.css: ${selector}`);
  const open = css.indexOf("{", at);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

describe("the page wrappers do not leave permanent stacking contexts", () => {
  const css = stripComments(readFileSync(CSS_PATH, "utf8"));

  for (const selector of [".cascade > *", ".route-fade"]) {
    it(`\`${selector}\` fills backwards, never both`, () => {
      const body = ruleBody(css, selector);
      expect(body, `${selector} must not use animation-fill-mode: both`).not.toMatch(
        /\bboth\b/,
      );
      expect(body, `${selector} must fill backwards`).toMatch(/\bbackwards\b/);
    });
  }

  it("keeps the cascade wrapper opacity-only, with no transform", () => {
    // A transform would also make it a containing block for fixed descendants,
    // which is the other half of the 5ee95ed3 bug.
    const body = ruleBody(css, ".cascade > *");
    expect(body).toMatch(/animation:\s*cascade-in/);
    expect(body).not.toMatch(/translate|scale|rotate/);
  });
});

describe("the search fields drop nothing over the page", () => {
  // The Saints' and the Bible's fields each rendered an absolutely positioned
  // z-50 dropdown over whatever block came next, which needed an explicit
  // z-index on the wrapper while the entrance animation made it a stacking
  // context. From 1.8 (the owner's pick of r3-12) both are doors to the one
  // search, drawn fixed by the root frame, outside every page's stacking
  // context, so no page's animation can hold it under what follows.
  const files = [
    join(process.cwd(), "components", "saints", "SaintSearch.tsx"),
    join(process.cwd(), "components", "bible", "BibleSearch.tsx"),
  ];

  for (const file of files) {
    const name = file.split(/[\\/]/).pop();

    it(`${name} opens the one search instead of a dropdown`, () => {
      const src = readFileSync(file, "utf8");
      expect(src, name).toContain("<SearchDoor");
      expect(src, name).not.toMatch(/absolute z-50/);
    });
  }

  it("draws the one search fixed over the whole screen", () => {
    const screen = readFileSync(join(process.cwd(), "components", "search", "CommandPalette.tsx"), "utf8");
    expect(screen).toContain('className="fixed inset-0 z-[120]');
  });
});
