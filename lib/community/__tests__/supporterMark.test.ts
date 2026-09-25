// SupporterMark rendered to static markup. There is no DOM harness in this
// suite (vitest runs in node, component testing is Playwright's job), but
// react-dom/server needs no DOM, and the accessibility contract is entirely
// in the markup: the role, the label, the hidden SVG and the absence of a
// tab stop. Outside a MessagesProvider useTranslate() returns the key
// itself, which is enough to prove the right key is chosen per tier.

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { SupporterMark } from "@/components/community/SupporterMark";

function render(tier: "plus" | "pro" | null | undefined): string {
  return renderToStaticMarkup(createElement(SupporterMark, { tier }));
}

describe("SupporterMark", () => {
  it("renders nothing for no mark", () => {
    expect(render(null)).toBe("");
    expect(render(undefined)).toBe("");
  });

  it("labels Plus with the supporter key", () => {
    const html = render("plus");
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="community.supporterMark"');
    expect(html).not.toContain("community.patronMark");
  });

  it("labels Pro with the patron key and draws the ring", () => {
    const html = render("pro");
    expect(html).toContain('aria-label="community.patronMark"');
    expect(html).toContain("<circle");
    expect(render("plus")).not.toContain("<circle");
  });

  it("is not a tab stop and speaks its label once", () => {
    const html = render("plus");
    expect(html).not.toContain("tabindex");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    // The tooltip repeats the label, hidden from assistive technology.
    expect(html.match(/community\.supporterMark/g)?.length).toBe(2);
  });

  it("uses palette tokens, not literal colours", () => {
    const html = render("pro");
    expect(html).toContain("var(--color-festal)");
    expect(html).toContain("var(--color-crimson)");
    expect(html).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});

// The tooltip's hiding and centring live in globals.css, not in the markup,
// so the component cannot carry them with it. When the mark was restored by
// hand (0e12f446) that block stayed behind on release/v1.4, and every
// Supporter and Patron label showed at all times, hanging off to the right
// of the mark and over the post's date line.
describe("the supporter tooltip stylesheet", () => {
  const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );

  /** Every body of a rule with exactly this selector, concatenated. */
  function bodies(selector: string): string {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[{};])\\s*${escaped}\\s*\\{([^}]*)\\}`, "g");
    return [...css.matchAll(re)].map((m) => m[2]).join("\n");
  }

  it("hides the label until hover, centred under the mark", () => {
    const rest = bodies(".supporter-mark-wrap .supporter-tip");
    expect(rest).toMatch(/opacity:\s*0/);
    expect(rest).toMatch(/translate\(-50%/);
    const hover = bodies(".supporter-mark-wrap:hover .supporter-tip");
    expect(hover).toMatch(/opacity:\s*1/);
    expect(hover).toMatch(/translate\(-50%,\s*0\)/);
  });

  it("drops the label on touch screens, where a tap would leave it stuck open", () => {
    expect(css).toMatch(
      /@media not all and \(hover: hover\)\s*\{\s*\.supporter-mark-wrap \.supporter-tip\s*\{\s*display:\s*none/,
    );
  });
});
