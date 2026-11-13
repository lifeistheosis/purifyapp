/**
 * A profile effect's specks are placed by a transform from the layer's top,
 * never by top or bottom (Updates 30's walk of the profile card). The layer
 * grows with the card while the profile comes, and a speck placed by
 * `top: 40%` or `bottom: -8px` moved in layout at every step of it: the
 * browser reported 44, 60 and 63px in one frame, and the gate failed the
 * tap that opens a profile. The place is the same: a hundredth of the layer's
 * height (1cqh) for `top: 1%`, and the speck's own height (100% in translate)
 * for the ones that stand on the foot.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const EFFECT = read("components/community/profile/ProfileEffect.tsx");
const CSS = read("app/globals.css");

/** The body of the first rule with exactly this selector, after `from`. */
function rule(css: string, selector: string, from = 0): string {
  const at = css.indexOf(`${selector} {`, from);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return css.slice(at, css.indexOf("}", at));
}

describe("a profile effect's specks", () => {
  it("are told how far down, never placed there by an inline top", () => {
    expect(EFFECT).not.toMatch(/top: `\$\{p\.top\}%`/);
    expect(EFFECT).toContain('...(p.top !== undefined ? { "--top": p.top } : {}),');
    expect(EFFECT).toContain('p.top !== undefined && "pfx-at"');
    expect(rule(CSS, ".pfx .pfx-p.pfx-at")).toContain("top: calc(var(--top) * 1%);");
  });

  it("are placed by a transform where container units are known, from the layer's top", () => {
    const at = CSS.indexOf("@supports (height: 1cqh) {");
    expect(at).toBeGreaterThanOrEqual(0);
    expect(rule(CSS, " .pfx", at)).toContain("container-type: size;");
    const placed = rule(CSS, " .pfx .pfx-p.pfx-at", at);
    expect(placed).toContain("top: 0;");
    expect(placed).toContain("translate: 0 calc(var(--top) * 1cqh);");
    const foot = rule(CSS, " .pfx-paschal-embers .pfx-p", at);
    expect(CSS.slice(at, CSS.indexOf(foot, at))).toMatch(/\.pfx-incense \.pfx-p,\s*\.pfx-candlelight \.pfx-p,\s*$/);
    expect(foot).toContain("top: 0;");
    expect(foot).toContain("translate: 0 calc(100cqh - var(--pfx-b) - 100%);");
  });

  it("that stand on the foot say how far below it, the same as their bottom", () => {
    const feet = [...CSS.matchAll(/(\.pfx-[a-z-]+ \.pfx-p(?:\.pfx-[a-z]+)?) \{([^}]*)\}/g)].filter((m) => /\bbottom:/.test(m[2]));
    expect(feet.map((m) => m[1]).sort()).toEqual([".pfx-candlelight .pfx-p", ".pfx-candlelight .pfx-p.pfx-still", ".pfx-incense .pfx-p", ".pfx-paschal-embers .pfx-p"]);
    for (const [, selector, body] of feet) {
      const bottom = /\bbottom: ([^;]+);/.exec(body)?.[1];
      expect(body, selector).toContain(`--pfx-b: ${bottom};`);
    }
  });
});
