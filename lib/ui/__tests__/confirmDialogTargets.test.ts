import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The house's question before an act that matters (components/ui/ConfirmDialog.tsx):
 * its two buttons are 44 to the touch.
 *
 * They stood at 39 until 2026-11-11. Their height came from their words and
 * their padding (`px-5 py-2` on 13px type), with no height written, so the
 * touch count (touchTargets.test.ts), which reads written heights, could not
 * see them; the drawing of the care note's question measured them
 * (scripts/mock-campaigns.mjs, still 45). Eighteen screens ask through this
 * one component: removing a post, ending a campaign, signing out everywhere,
 * blocking a reader, sending the care note.
 *
 * What would go wrong if this broke: the two answers to "are you sure" are
 * the two controls a thumb must not miss, and Cancel beside Remove at 39px
 * is where it would.
 */

const code = readFileSync(join(process.cwd(), "components/ui/ConfirmDialog.tsx"), "utf8");

/** The opening tag of the button that calls this handler, comments and all. */
function buttonCalling(handler: string): string {
  const at = code.indexOf(`onClick={${handler}}`);
  expect(at, handler).toBeGreaterThan(-1);
  const from = code.lastIndexOf("<button", at);
  const to = code.indexOf(">\n", at);
  expect(from, handler).toBeGreaterThan(-1);
  expect(to, handler).toBeGreaterThan(at);
  return code.slice(from, to);
}

describe("the confirm dialog's two answers", () => {
  it("Cancel is 44 to the touch", () => {
    expect(buttonCalling("onCancel")).toMatch(/className="min-h-11 /);
  });

  it("the act itself is 44 to the touch, in either colour", () => {
    const tag = buttonCalling("onConfirm");
    // One class string for both: the accent (gold, or crimson for a removal) is added after it.
    expect(tag).toMatch(/"min-h-11 [^"]* " \+\s*confirmAccent/);
  });

  it("neither is given a height under 44 beside it", () => {
    for (const handler of ["onCancel", "onConfirm"]) {
      const tag = buttonCalling(handler);
      expect(tag, handler).not.toMatch(/(?<![\w-])(?:min-)?h-(?:[1-9]|10)\b|(?<![\w-])size-(?:[1-9]|10)\b|max-h-/);
    }
  });

  it("there are only these two, and the backdrop that closes it", () => {
    expect(code.match(/<button/g)).toHaveLength(3);
    // The backdrop is the whole screen behind the card, so it has no size to hold.
    expect(code).toMatch(/onClick=\{dismiss\}\s*className="absolute inset-0 /);
  });
});
