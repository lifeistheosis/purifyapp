import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/i18n/MessagesProvider", () => ({ useTranslate: () => ({ t: (k: string) => k }) }));

import { SupporterMarkButton } from "@/components/community/SupporterMarkButton";

// The owner's Identity 2 (1.9): a tap on the cross says what it means.
describe("the supporter mark as a button", () => {
  it("is a button that opens a dialog, named by the mark", () => {
    const html = renderToStaticMarkup(createElement(SupporterMarkButton, { tier: "plus" }));
    expect(html).toContain("<button");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-label="community.supporterMark"');
    expect(html).toContain("hit-44");
  });

  it("names Pro as the patron mark", () => {
    expect(renderToStaticMarkup(createElement(SupporterMarkButton, { tier: "pro" }))).toContain('aria-label="community.patronMark"');
  });

  it("draws nothing for a reader without a mark", () => {
    expect(renderToStaticMarkup(createElement(SupporterMarkButton, { tier: null }))).toBe("");
  });
});
