// SupporterMark rendered to static markup. There is no DOM harness in this
// suite (vitest runs in node, component testing is Playwright's job), but
// react-dom/server needs no DOM, and the accessibility contract is entirely
// in the markup: the role, the label, the hidden SVG and the absence of a
// tab stop. Outside a MessagesProvider useTranslate() returns the key
// itself, which is enough to prove the right key is chosen per tier.

import { describe, expect, it } from "vitest";
import { createElement } from "react";
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
